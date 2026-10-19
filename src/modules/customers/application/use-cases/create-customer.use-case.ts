import { Injectable } from '@nestjs/common';
import { CreateCustomerDto } from '../dto/customer.dto';
import { CustomerService } from '../../../../infra/customers/services/customer.service';

@Injectable()
export class CreateCustomerUseCase {
  constructor(private readonly customers: CustomerService) {}

  execute(input: CreateCustomerDto, actorId: string) {
    return this.customers.create(input, actorId);
  }
}
