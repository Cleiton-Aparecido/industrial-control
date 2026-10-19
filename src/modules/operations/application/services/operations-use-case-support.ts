import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import {
  OrderEntity,
  OrderStatus,
} from 'src/infra/orders/entities/order.entity';
import { OrderItemEntity } from 'src/infra/orders/entities/order-item.entity';
import { OrderStatusHistoryEntity } from 'src/infra/orders/entities/order-status-history.entity';
import { ProductEntity } from 'src/infra/products/entities/product.entity';
import { StockBalanceEntity } from 'src/infra/stock/entities/stock-balance.entity';
import {
  StockMovementEntity,
  StockMovementType,
} from 'src/infra/stock/entities/stock-movement.entity';
import { StockMovementDto } from 'src/modules/stock/application/dto/stock.dto';
import { toMilliUnits } from 'src/infra/stock/stock-quantity';

@Injectable()
export class OperationsUseCaseSupport {
  constructor(@InjectDataSource() protected readonly dataSource: DataSource) {}

  protected async transition(
    id: string,
    actorId: string,
    expected: OrderStatus,
    next: OrderStatus,
    notes: string | undefined,
    mutate: (order: OrderEntity) => void,
    requireAssignee = false,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const order = await this.lockOrder(manager, id);
      if (order.status === next) {
        if (
          (requireAssignee || next === OrderStatus.PROCESSING) &&
          order.assignedToUserId !== actorId
        ) {
          throw new ForbiddenException(
            'Somente o responsável pelo processamento pode repetir esta operação',
          );
        }
        return this.orderResponse(manager, order);
      }
      this.assertTransition(order, expected, actorId, requireAssignee);
      const previous = order.status;
      order.status = next;
      mutate(order);
      await manager.save(order);
      await this.recordTransition(manager, order, previous, actorId, notes);
      await this.audit(
        manager,
        actorId,
        `order.${next.toLowerCase()}`,
        'order',
        id,
      );
      return this.orderResponse(manager, order);
    });
  }

  protected assertTransition(
    order: OrderEntity,
    expected: OrderStatus,
    actorId: string,
    requireAssignee: boolean,
  ) {
    if (order.status !== expected) {
      throw new ConflictException(
        `Transição inválida: ${order.status} para o próximo estado`,
      );
    }
    if (requireAssignee && order.assignedToUserId !== actorId) {
      throw new ForbiddenException(
        'Somente o responsável pelo processamento pode avançar este pedido',
      );
    }
  }

  protected async lockOrder(manager: EntityManager, id: string) {
    const order = await manager.findOne(OrderEntity, {
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
    if (!order) throw new NotFoundException('Pedido não encontrado');
    return order;
  }

  protected async lockBalance(manager: EntityManager, productId: string) {
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

  protected async idempotentMovement(
    manager: EntityManager,
    input: StockMovementDto,
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

  protected async getProductWithManager(manager: EntityManager, id: string) {
    const product = await manager.findOne(ProductEntity, { where: { id } });
    if (!product) throw new NotFoundException('Produto não encontrado');
    return product;
  }

  protected async orderResponse(manager: EntityManager, order: OrderEntity) {
    const items = await manager.find(OrderItemEntity, {
      where: { orderId: order.id },
      order: { createdAt: 'ASC' },
    });
    return { ...order, items };
  }

  protected async recordTransition(
    manager: EntityManager,
    order: OrderEntity,
    previousStatus: OrderStatus,
    actorId: string,
    notes?: string,
  ) {
    await manager.getRepository(OrderStatusHistoryEntity).save({
      orderId: order.id,
      previousStatus,
      newStatus: order.status,
      changedByUserId: actorId,
      notes: notes ?? null,
    });
  }

  protected async audit(
    manager: EntityManager,
    actorId: string,
    action: string,
    resourceType: string,
    resourceId: string,
    metadata?: Record<string, unknown>,
  ) {
    await manager.query(
      `INSERT INTO "audit_logs" ("actor_user_id", "action", "resource_type", "resource_id", "metadata") VALUES ($1, $2, $3, $4, $5::jsonb)`,
      [
        actorId,
        action,
        resourceType,
        resourceId,
        metadata ? JSON.stringify(metadata) : null,
      ],
    );
  }

  protected async recordAudit(
    actorId: string,
    action: string,
    resourceType: string,
    resourceId: string,
    metadata?: Record<string, unknown>,
  ) {
    await this.dataSource.query(
      `INSERT INTO "audit_logs" ("actor_user_id", "action", "resource_type", "resource_id", "metadata") VALUES ($1, $2, $3, $4, $5::jsonb)`,
      [
        actorId,
        action,
        resourceType,
        resourceId,
        metadata ? JSON.stringify(metadata) : null,
      ],
    );
  }

  protected validateDateRange(from?: string, to?: string) {
    if (from && Number.isNaN(Date.parse(from))) {
      throw new BadRequestException('Data inicial inválida');
    }
    if (to && Number.isNaN(Date.parse(to))) {
      throw new BadRequestException('Data final inválida');
    }
    if (from && to && Date.parse(from) > Date.parse(to)) {
      throw new BadRequestException(
        'A data inicial deve ser anterior à data final',
      );
    }
  }
}
