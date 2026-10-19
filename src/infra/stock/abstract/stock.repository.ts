import { ProductEntity } from 'src/infra/products/entities/product.entity';
import { StockBalanceEntity } from '../entities/stock-balance.entity';
import {
  StockMovementEntity,
  StockMovementType,
} from '../entities/stock-movement.entity';

export type StockMovementCommand = {
  productId: string;
  quantity: string;
  reason: string;
  movementType?: string;
  idempotencyKey?: string;
};

export type StockMovementFilter = {
  type?: string;
  productId?: string;
  userId?: string;
  orderId?: string;
  from?: string;
  to?: string;
};

export type StockPage<T> = { items: T[]; total: number };

export abstract class IStockRepository {
  abstract findProductById(id: string): Promise<ProductEntity | null>;
  abstract findBalanceByProduct(
    productId: string,
  ): Promise<StockBalanceEntity | null>;
  abstract listBalances(
    page: number,
    limit: number,
  ): Promise<StockPage<StockBalanceEntity>>;
  abstract recordMovement(
    input: StockMovementCommand,
    type: StockMovementType,
    actorId: string,
    reference?: { type: string; id: string },
  ): Promise<StockMovementEntity>;
  abstract listMovements(
    filters: StockMovementFilter,
    page: number,
    limit: number,
  ): Promise<StockPage<StockMovementEntity>>;
  abstract findMovementById(id: string): Promise<StockMovementEntity | null>;
}
