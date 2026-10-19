import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { OrderStatus } from './order.entity';

@Entity('order_status_history')
@Index('IDX_order_history_order_created', ['orderId', 'createdAt'])
export class OrderStatusHistoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId: string;

  @Column({
    name: 'previous_status',
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  previousStatus: OrderStatus | null;

  @Column({ name: 'new_status', type: 'varchar', length: 30 })
  newStatus: OrderStatus;

  @Column({ name: 'changed_by_user_id', type: 'uuid', nullable: true })
  changedByUserId: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
