import { Injectable } from '@nestjs/common';
import { CustomerService } from '../../../../infra/customers/services/customer.service';

@Injectable()
export class FindCustomerByIdUseCase {
  constructor(private readonly customers: CustomerService) {}

  execute(id: string) {
    return this.customers.get(id);
  }
}
