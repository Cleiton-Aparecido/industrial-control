import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  CreateCustomerData,
  CustomerPage,
  ICustomerRepository,
} from '../abstract/customer.repository';
import { CustomerEntity } from '../entities/customer.entity';

@Injectable()
export class CustomerRepository extends ICustomerRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {
    super();
  }

  async create(data: CreateCustomerData): Promise<CustomerEntity> {
    return this.dataSource.getRepository(CustomerEntity).save(data);
  }

  findByDocument(documentNumber: string): Promise<CustomerEntity | null> {
    return this.dataSource
      .getRepository(CustomerEntity)
      .findOneBy({ documentNumber });
  }

  findById(id: string): Promise<CustomerEntity | null> {
    return this.dataSource.getRepository(CustomerEntity).findOneBy({ id });
  }

  async findPage(
    page: number,
    limit: number,
    search?: string,
  ): Promise<CustomerPage> {
    const repository = this.dataSource.getRepository(CustomerEntity);
    const query = repository
      .createQueryBuilder('customer')
      .orderBy('customer.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);
    if (search?.trim()) {
      const term = `%${search.trim()}%`;
      query.where(
        '(customer.name ILIKE :term OR customer.document_number ILIKE :term OR customer.email ILIKE :term OR customer.phone ILIKE :term)',
        { term },
      );
    }
    const [items, total] = await query.getManyAndCount();
    return { items, total };
  }

  save(customer: CustomerEntity): Promise<CustomerEntity> {
    return this.dataSource.getRepository(CustomerEntity).save(customer);
  }
}
