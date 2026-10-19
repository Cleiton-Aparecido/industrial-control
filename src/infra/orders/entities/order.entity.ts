import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum OrderStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  READY_FOR_SHIPMENT = 'READY_FOR_SHIPMENT',
  IN_TRANSIT = 'IN_TRANSIT',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

@Entity('orders')
@Index('IDX_orders_status_created', ['status', 'createdAt'])
export class OrderEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId: string;

  @Column({ name: 'created_by_user_id', type: 'uuid' })
  createdByUserId: string;

  @Column({
    name: 'idempotency_key',
    type: 'varchar',
    length: 150,
    nullable: true,
    unique: true,
  })
  idempotencyKey: string | null;

  @Column({ type: 'varchar', length: 30, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Column({ name: 'customer_name_snapshot', type: 'varchar', length: 180 })
  customerNameSnapshot: string;

  @Column({ name: 'customer_document_snapshot', type: 'varchar', length: 14 })
  customerDocumentSnapshot: string;

  @Column({ name: 'delivery_address_snapshot', type: 'jsonb', nullable: true })
  deliveryAddressSnapshot: Record<string, string> | null;

  @Column({ name: 'customer_notes', type: 'text', nullable: true })
  customerNotes: string | null;

  @Column({ name: 'internal_notes', type: 'text', nullable: true })
  internalNotes: string | null;

  @Column({ name: 'assigned_to_user_id', type: 'uuid', nullable: true })
  assignedToUserId: string | null;

  @Column({
    name: 'processing_started_at',
    type: 'timestamptz',
    nullable: true,
  })
  processingStartedAt: Date | null;

  @Column({
    name: 'ready_for_shipment_at',
    type: 'timestamptz',
    nullable: true,
  })
  readyForShipmentAt: Date | null;

  @Column({ name: 'shipped_at', type: 'timestamptz', nullable: true })
  shippedAt: Date | null;

  @Column({ name: 'delivered_at', type: 'timestamptz', nullable: true })
  deliveredAt: Date | null;

  @Column({ name: 'delivery_notes', type: 'text', nullable: true })
  deliveryNotes: string | null;

  @Column({ name: 'submitted_at', type: 'timestamptz', default: () => 'now()' })
  submittedAt: Date;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
