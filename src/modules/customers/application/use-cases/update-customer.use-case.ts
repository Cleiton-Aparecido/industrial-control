import { Injectable } from '@nestjs/common';
import { UpdateCustomerDto } from '../dto/customer.dto';
import { CustomerService } from '../../../../infra/customers/services/customer.service';

@Injectable()
export class UpdateCustomerUseCase {
  constructor(private readonly customers: CustomerService) {}

  execute(id: string, input: UpdateCustomerDto, actorId: string) {
    return this.customers.update(id, input, actorId);
  }
}
