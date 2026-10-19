import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('order_items')
@Index('IDX_order_items_order', ['orderId'])
export class OrderItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @Column({ name: 'product_name_snapshot', type: 'varchar', length: 180 })
  productNameSnapshot: string;

  @Column({
    name: 'product_sku_snapshot',
    type: 'varchar',
    length: 80,
    nullable: true,
  })
  productSkuSnapshot: string | null;

  @Column({ name: 'unit_snapshot', type: 'varchar', length: 40 })
  unitSnapshot: string;

  @Column({ type: 'numeric', precision: 14, scale: 3 })
  quantity: string;

  @Column({
    name: 'unit_price_snapshot',
    type: 'numeric',
    precision: 14,
    scale: 2,
    default: '0.00',
  })
  unitPriceSnapshot: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
