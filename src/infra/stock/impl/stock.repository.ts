import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import {
  IStockRepository,
  StockMovementCommand,
  StockMovementFilter,
  StockPage,
} from '../abstract/stock.repository';
import { ProductEntity } from 'src/infra/products/entities/product.entity';
import { StockBalanceEntity } from '../entities/stock-balance.entity';
import {
  StockMovementEntity,
  StockMovementType,
} from '../entities/stock-movement.entity';
import { fromMilliUnits, toMilliUnits } from '../stock-quantity';

@Injectable()
export class StockRepository extends IStockRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {
    super();
  }

  findProductById(id: string): Promise<ProductEntity | null> {
    return this.dataSource.getRepository(ProductEntity).findOneBy({ id });
  }

  findBalanceByProduct(productId: string): Promise<StockBalanceEntity | null> {
    return this.dataSource
      .getRepository(StockBalanceEntity)
      .findOneBy({ productId });
  }

  async listBalances(
    page: number,
    limit: number,
  ): Promise<StockPage<StockBalanceEntity>> {
    const [items, total] = await this.dataSource
      .getRepository(StockBalanceEntity)
      .findAndCount({
        order: { updatedAt: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      });
    return { items, total };
  }

  recordMovement(
    input: StockMovementCommand,
    type: StockMovementType,
    actorId: string,
    reference?: { type: string; id: string },
  ): Promise<StockMovementEntity> {
    return this.dataSource.transaction(async (manager) => {
      if (input.idempotencyKey) {
        await manager.query(
          'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
          [input.idempotencyKey],
        );
      }
      const product = await manager.findOne(ProductEntity, {
        where: { id: input.productId },
      });
      if (!product) throw new NotFoundException('Produto não encontrado');
      const balance = await this.lockBalance(manager, input.productId);
      const previous = await this.findIdempotentMovement(manager, input, type);
      if (previous) return previous;

      const quantity = toMilliUnits(input.quantity);
      const onHand = toMilliUnits(balance.quantityOnHand);
      const reserved = toMilliUnits(balance.quantityReserved);
      const isAddition =
        type === StockMovementType.ENTRY ||
        type === StockMovementType.ADJUSTMENT_IN;
      if (!isAddition && onHand - reserved < quantity) {
        throw new ConflictException('Estoque disponível insuficiente');
      }
      const nextOnHand = isAddition ? onHand + quantity : onHand - quantity;
      balance.quantityOnHand = fromMilliUnits(nextOnHand);
      await manager.save(balance);
      const movement = await manager.getRepository(StockMovementEntity).save({
        productId: input.productId,
        movementType: type,
        quantity: fromMilliUnits(quantity),
        quantityBefore: fromMilliUnits(onHand),
        quantityAfter: fromMilliUnits(nextOnHand),
        reservedBefore: fromMilliUnits(reserved),
        reservedAfter: fromMilliUnits(reserved),
        reason: input.reason,
        referenceType: reference?.type ?? null,
        referenceId: reference?.id ?? null,
        idempotencyKey: input.idempotencyKey ?? null,
        performedByUserId: actorId,
      });
      await manager.query(
        `INSERT INTO "audit_logs" ("actor_user_id", "action", "resource_type", "resource_id", "metadata") VALUES ($1, $2, $3, $4, $5::jsonb)`,
        [
          actorId,
          'stock.movement.created',
          'stock_movement',
          movement.id,
          JSON.stringify({ type, productId: input.productId }),
        ],
      );
      return movement;
    });
  }

  async listMovements(
    filters: StockMovementFilter,
    page: number,
    limit: number,
  ): Promise<StockPage<StockMovementEntity>> {
    const query = this.dataSource
      .getRepository(StockMovementEntity)
      .createQueryBuilder('movement')
      .orderBy('movement.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);
    if (filters.type) {
      query.andWhere('movement.movementType = :type', { type: filters.type });
    }
    if (filters.productId) {
      query.andWhere('movement.productId = :productId', {
        productId: filters.productId,
      });
    }
    if (filters.userId) {
      query.andWhere('movement.performedByUserId = :userId', {
        userId: filters.userId,
      });
    }
    if (filters.orderId) {
      query.andWhere('movement.referenceId = :orderId', {
        orderId: filters.orderId,
      });
    }
    if (filters.from) {
      query.andWhere('movement.createdAt >= :from', { from: filters.from });
    }
    if (filters.to) {
      query.andWhere('movement.createdAt <= :to', { to: filters.to });
    }
    const [items, total] = await query.getManyAndCount();
    return { items, total };
  }

  findMovementById(id: string): Promise<StockMovementEntity | null> {
    return this.dataSource.getRepository(StockMovementEntity).findOneBy({ id });
  }

  private async lockBalance(manager: EntityManager, productId: string) {
    await manager.query(
      `INSERT INTO "stock_balances" ("product_id") VALUES ($1) ON CONFLICT ("product_id") DO NOTHING`,
      [productId],
    );
    const balance = await manager.findOne(StockBalanceEntity, {
      where: { productId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!balance)
      throw new NotFoundException('Saldo de estoque não encontrado');
    return balance;
  }

  private async findIdempotentMovement(
    manager: EntityManager,
    input: StockMovementCommand,
    type: StockMovementType,
  ) {
    if (!input.idempotencyKey) return null;
    const movement = await manager.findOne(StockMovementEntity, {
      where: { idempotencyKey: input.idempotencyKey },
    });
    if (!movement) return null;
    if (
      movement.productId !== input.productId ||
      movement.movementType !== type ||
      toMilliUnits(movement.quantity) !== toMilliUnits(input.quantity)
    ) {
      throw new ConflictException(
        'Idempotency-Key já utilizada com outra operação',
      );
    }
    return movement;
  }
}
