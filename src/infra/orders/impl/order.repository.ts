import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import {
  IOrderRepository,
  IOrderUnitOfWork,
  OrderListFilter,
  OrderPage,
  OrderWithItems,
} from '../abstract/order.repository';
import { CustomerEntity } from 'src/infra/customers/entities/customer.entity';
import { OrderEntity, OrderStatus } from '../entities/order.entity';
import { OrderItemEntity } from '../entities/order-item.entity';
import { OrderStatusHistoryEntity } from '../entities/order-status-history.entity';
import { ProductEntity } from 'src/infra/products/entities/product.entity';
import { StockBalanceEntity } from 'src/infra/stock/entities/stock-balance.entity';
import { StockMovementEntity } from 'src/infra/stock/entities/stock-movement.entity';

@Injectable()
export class OrderRepository extends IOrderRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {
    super();
  }

  transaction<T>(
    operation: (unitOfWork: IOrderUnitOfWork) => Promise<T>,
  ): Promise<T> {
    return this.dataSource.transaction((manager) =>
      operation(new TypeOrmOrderUnitOfWork(manager)),
    );
  }

  findByIdempotencyKey(key: string): Promise<OrderEntity | null> {
    return this.dataSource
      .getRepository(OrderEntity)
      .findOneBy({ idempotencyKey: key });
  }

  findCustomerById(id: string): Promise<CustomerEntity | null> {
    return this.dataSource.getRepository(CustomerEntity).findOneBy({ id });
  }

  findById(id: string): Promise<OrderEntity | null> {
    return this.dataSource.getRepository(OrderEntity).findOneBy({ id });
  }

  findHistory(orderId: string): Promise<OrderStatusHistoryEntity[]> {
    return this.dataSource.getRepository(OrderStatusHistoryEntity).find({
      where: { orderId },
      order: { createdAt: 'ASC' },
    });
  }

  async list(filters: OrderListFilter): Promise<OrderPage> {
    const query = this.dataSource
      .getRepository(OrderEntity)
      .createQueryBuilder('order')
      .orderBy('order.createdAt', 'DESC')
      .skip((filters.page - 1) * filters.limit)
      .take(filters.limit);
    if (filters.actorId && !filters.canReadAll) {
      query.andWhere('order.createdByUserId = :actorId', {
        actorId: filters.actorId,
      });
    }
    if (filters.customerId) {
      query.andWhere('order.customerId = :customerId', {
        customerId: filters.customerId,
      });
    }
    if (filters.status) {
      query.andWhere('order.status = :status', { status: filters.status });
    }
    if (filters.createdByUserId) {
      query.andWhere('order.createdByUserId = :createdByUserId', {
        createdByUserId: filters.createdByUserId,
      });
    }
    if (filters.from) {
      query.andWhere('order.createdAt >= :from', { from: filters.from });
    }
    if (filters.to) {
      query.andWhere('order.createdAt <= :to', { to: filters.to });
    }
    const [items, total] = await query.getManyAndCount();
    return { items, total };
  }

  withItems(order: OrderEntity): Promise<OrderWithItems> {
    return new TypeOrmOrderUnitOfWork(this.dataSource.manager).withItems(order);
  }
}

class TypeOrmOrderUnitOfWork implements IOrderUnitOfWork {
  constructor(private readonly manager: EntityManager) {}

  async lockIdempotencyKey(key: string): Promise<void> {
    await this.manager.query(
      'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
      [key],
    );
  }

  findByIdempotencyKey(key: string): Promise<OrderEntity | null> {
    return this.manager.findOne(OrderEntity, {
      where: { idempotencyKey: key },
    });
  }

  findCustomerById(id: string): Promise<CustomerEntity | null> {
    return this.manager.findOneBy(CustomerEntity, { id });
  }

  findProductById(id: string): Promise<ProductEntity | null> {
    return this.manager.findOneBy(ProductEntity, { id });
  }

  async lockBalance(productId: string): Promise<StockBalanceEntity> {
    await this.manager.query(
      `INSERT INTO "stock_balances" ("product_id") VALUES ($1) ON CONFLICT ("product_id") DO NOTHING`,
      [productId],
    );
    const balance = await this.manager.findOne(StockBalanceEntity, {
      where: { productId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!balance)
      throw new NotFoundException('Saldo de estoque não encontrado');
    return balance;
  }

  lockOrder(id: string): Promise<OrderEntity | null> {
    return this.manager.findOne(OrderEntity, {
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
  }

  findItems(orderId: string): Promise<OrderItemEntity[]> {
    return this.manager.find(OrderItemEntity, { where: { orderId } });
  }

  saveOrder(data: Partial<OrderEntity>): Promise<OrderEntity> {
    return this.manager.save(OrderEntity, data);
  }

  saveBalance(balance: StockBalanceEntity): Promise<StockBalanceEntity> {
    return this.manager.save(balance);
  }

  saveItem(data: Partial<OrderItemEntity>): Promise<OrderItemEntity> {
    return this.manager.getRepository(OrderItemEntity).save(data);
  }

  saveMovement(
    data: Partial<StockMovementEntity>,
  ): Promise<StockMovementEntity> {
    return this.manager.getRepository(StockMovementEntity).save(data);
  }

  saveHistory(
    data: Partial<OrderStatusHistoryEntity>,
  ): Promise<OrderStatusHistoryEntity> {
    return this.manager.getRepository(OrderStatusHistoryEntity).save(data);
  }

  async audit(
    actorId: string,
    action: string,
    resourceType: string,
    resourceId: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.manager.query(
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

  async withItems(order: OrderEntity): Promise<OrderWithItems> {
    const items = await this.manager.find(OrderItemEntity, {
      where: { orderId: order.id },
      order: { createdAt: 'ASC' },
    });
    return { ...order, items };
  }
}
