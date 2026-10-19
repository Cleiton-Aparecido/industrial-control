import { Module } from '@nestjs/common';
import { CustomersInfrastructureModule } from 'src/infra/customers/customers.module';
import { OperationsModule } from 'src/modules/operations/operations.module';
import { OrdersModule } from 'src/modules/orders/orders.module';
import { CreateCustomerUseCase } from './application/use-cases/create-customer.use-case';
import { FindCustomerByDocumentUseCase } from './application/use-cases/find-customer-by-document.use-case';
import { FindCustomerByIdUseCase } from './application/use-cases/find-customer-by-id.use-case';
import { ListCustomersUseCase } from './application/use-cases/list-customers.use-case';
import { SetCustomerActiveUseCase } from './application/use-cases/set-customer-active.use-case';
import { UpdateCustomerUseCase } from './application/use-cases/update-customer.use-case';
import { CustomersController } from './presentation/controllers/customers.controller';

@Module({
  imports: [CustomersInfrastructureModule, OperationsModule, OrdersModule],
  controllers: [CustomersController],
  providers: [
    CreateCustomerUseCase,
    FindCustomerByDocumentUseCase,
    ListCustomersUseCase,
    FindCustomerByIdUseCase,
    UpdateCustomerUseCase,
    SetCustomerActiveUseCase,
  ],
})
export class CustomersModule {}
