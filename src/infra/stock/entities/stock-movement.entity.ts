import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum StockMovementType {
  ENTRY = 'ENTRY',
  EXIT = 'EXIT',
  ADJUSTMENT_IN = 'ADJUSTMENT_IN',
  ADJUSTMENT_OUT = 'ADJUSTMENT_OUT',
  RESERVATION = 'RESERVATION',
  RELEASE = 'RELEASE',
}

@Entity('stock_movements')
@Index('UQ_stock_movements_idempotency', ['idempotencyKey'], {
  unique: true,
  where: 'idempotency_key IS NOT NULL',
})
@Index('IDX_stock_movements_product_created', ['productId', 'createdAt'])
@Index('IDX_stock_movements_user_created', ['performedByUserId', 'createdAt'])
@Index('IDX_stock_movements_reference', ['referenceType', 'referenceId'])
export class StockMovementEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @Column({ name: 'movement_type', type: 'varchar', length: 20 })
  movementType: StockMovementType;

  @Column({ type: 'numeric', precision: 14, scale: 3 })
  quantity: string;

  @Column({ name: 'quantity_before', type: 'numeric', precision: 14, scale: 3 })
  quantityBefore: string;

  @Column({ name: 'quantity_after', type: 'numeric', precision: 14, scale: 3 })
  quantityAfter: string;

  @Column({
    name: 'reserved_before',
    type: 'numeric',
    precision: 14,
    scale: 3,
    default: 0,
  })
  reservedBefore: string;

  @Column({
    name: 'reserved_after',
    type: 'numeric',
    precision: 14,
    scale: 3,
    default: 0,
  })
  reservedAfter: string;

  @Column({ type: 'text' })
  reason: string;

  @Column({
    name: 'reference_type',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  referenceType: string | null;

  @Column({ name: 'reference_id', type: 'uuid', nullable: true })
  referenceId: string | null;

  @Column({
    name: 'idempotency_key',
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  idempotencyKey: string | null;

  @Column({ name: 'performed_by_user_id', type: 'uuid', nullable: true })
  performedByUserId: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
