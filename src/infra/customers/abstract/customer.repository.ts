import { CustomerEntity } from '../entities/customer.entity';

export type CreateCustomerData = Pick<
  CustomerEntity,
  | 'documentType'
  | 'documentNumber'
  | 'name'
  | 'tradeName'
  | 'address'
  | 'phone'
  | 'email'
  | 'notes'
  | 'isActive'
>;

export type CustomerPage = { items: CustomerEntity[]; total: number };

export abstract class ICustomerRepository {
  abstract create(data: CreateCustomerData): Promise<CustomerEntity>;
  abstract findByDocument(
    documentNumber: string,
  ): Promise<CustomerEntity | null>;
  abstract findById(id: string): Promise<CustomerEntity | null>;
  abstract findPage(
    page: number,
    limit: number,
    search?: string,
  ): Promise<CustomerPage>;
  abstract save(customer: CustomerEntity): Promise<CustomerEntity>;
}
