import { Injectable } from '@nestjs/common';
import { CustomerService } from '../../../../infra/customers/services/customer.service';

@Injectable()
export class SetCustomerActiveUseCase {
  constructor(private readonly customers: CustomerService) {}

  execute(id: string, isActive: boolean, actorId: string) {
    return this.customers.setActive(id, isActive, actorId);
  }
}
