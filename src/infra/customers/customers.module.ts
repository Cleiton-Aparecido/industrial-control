import { Module } from '@nestjs/common';
import { ICustomerRepository } from './abstract/customer.repository';
import { CustomerRepository } from './impl/customer.repository';
import { CustomerService } from './services/customer.service';
import { AuditLogInfrastructureModule } from '../data/audit-log.module';
import { DataModule } from '../data/data.module';

@Module({
  imports: [DataModule, AuditLogInfrastructureModule],
  providers: [
    CustomerService,
    { provide: ICustomerRepository, useClass: CustomerRepository },
  ],
  exports: [CustomerService],
})
export class CustomersInfrastructureModule {}
