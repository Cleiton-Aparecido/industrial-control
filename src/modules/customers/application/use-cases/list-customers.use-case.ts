import { Injectable } from '@nestjs/common';
import { CustomerService } from 'src/infra/customers/services/customer.service';

@Injectable()
export class ListCustomersUseCase {
  constructor(private readonly customers: CustomerService) {}

  execute(page = 1, limit = 25, search?: string) {
    return this.customers.list(page, limit, search);
  }
}
