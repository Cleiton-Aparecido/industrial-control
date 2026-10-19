import { Injectable } from '@nestjs/common';
import { CustomerService } from '../../../../infra/customers/services/customer.service';

@Injectable()
export class FindCustomerByDocumentUseCase {
  constructor(private readonly customers: CustomerService) {}

  execute(document: string) {
    return this.customers.findByDocument(document);
  }
}
