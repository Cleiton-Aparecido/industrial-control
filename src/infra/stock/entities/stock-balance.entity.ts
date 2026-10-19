import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('stock_balances')
@Index('UQ_stock_balances_product', ['productId'], { unique: true })
export class StockBalanceEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @Column({
    name: 'quantity_on_hand',
    type: 'numeric',
    precision: 14,
    scale: 3,
    default: 0,
  })
  quantityOnHand: string;

  @Column({
    name: 'quantity_reserved',
    type: 'numeric',
    precision: 14,
    scale: 3,
    default: 0,
  })
  quantityReserved: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
