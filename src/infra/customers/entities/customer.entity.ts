import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('customers')
@Index('UQ_customers_document_number', ['documentNumber'], { unique: true })
export class CustomerEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'document_type', type: 'varchar', length: 4 })
  documentType: 'CPF' | 'CNPJ';

  @Column({ name: 'document_number', type: 'varchar', length: 14 })
  documentNumber: string;

  @Column({ type: 'varchar', length: 180 })
  name: string;

  @Column({ name: 'trade_name', type: 'varchar', length: 180, nullable: true })
  tradeName: string | null;

  @Column({ type: 'jsonb', nullable: true })
  address: Record<string, string> | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
