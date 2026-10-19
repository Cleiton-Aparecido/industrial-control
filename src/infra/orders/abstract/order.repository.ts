import { CustomerEntity } from 'src/infra/customers/entities/customer.entity';
import { OrderEntity } from '../entities/order.entity';
import { OrderItemEntity } from '../entities/order-item.entity';
import { OrderStatusHistoryEntity } from '../entities/order-status-history.entity';
import { StockBalanceEntity } from 'src/infra/stock/entities/stock-balance.entity';
import { StockMovementEntity } from 'src/infra/stock/entities/stock-movement.entity';

export type OrderWithItems = OrderEntity & { items: OrderItemEntity[] };
export type OrderPage = { items: OrderEntity[]; total: number };
export type OrderListFilter = {
  actorId?: string;
  canReadAll: boolean;
  customerId?: string;
  status?: string;
  createdByUserId?: string;
  from?: string;
  to?: string;
  page: number;
  limit: number;
};

export interface IOrderUnitOfWork {
  lockIdempotencyKey(key: string): Promise<void>;
  findByIdempotencyKey(key: string): Promise<OrderEntity | null>;
  findCustomerById(id: string): Promise<CustomerEntity | null>;
  findProductById(
    id: string,
  ): Promise<
    import('src/infra/products/entities/product.entity').ProductEntity | null
  >;
  lockBalance(productId: string): Promise<StockBalanceEntity>;
  lockOrder(id: string): Promise<OrderEntity | null>;
  findItems(orderId: string): Promise<OrderItemEntity[]>;
  saveOrder(data: Partial<OrderEntity>): Promise<OrderEntity>;
  saveBalance(balance: StockBalanceEntity): Promise<StockBalanceEntity>;
  saveItem(data: Partial<OrderItemEntity>): Promise<OrderItemEntity>;
  saveMovement(
    data: Partial<StockMovementEntity>,
  ): Promise<StockMovementEntity>;
  saveHistory(
    data: Partial<OrderStatusHistoryEntity>,
  ): Promise<OrderStatusHistoryEntity>;
  audit(
    actorId: string,
    action: string,
    resourceType: string,
    resourceId: string,
    metadata?: Record<string, unknown>,
  ): Promise<void>;
  withItems(order: OrderEntity): Promise<OrderWithItems>;
}

export abstract class IOrderRepository {
  abstract transaction<T>(
    operation: (unitOfWork: IOrderUnitOfWork) => Promise<T>,
  ): Promise<T>;
  abstract findByIdempotencyKey(key: string): Promise<OrderEntity | null>;
  abstract findCustomerById(id: string): Promise<CustomerEntity | null>;
  abstract findById(id: string): Promise<OrderEntity | null>;
  abstract findHistory(orderId: string): Promise<OrderStatusHistoryEntity[]>;
  abstract list(filters: OrderListFilter): Promise<OrderPage>;
  abstract withItems(order: OrderEntity): Promise<OrderWithItems>;
}
