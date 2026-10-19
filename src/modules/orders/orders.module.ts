import { Module } from '@nestjs/common';
import { OrdersInfrastructureModule } from 'src/infra/orders/orders.module';
import { CancelOrderUseCase } from './application/use-cases/cancel-order.use-case';
import { CreateOrderUseCase } from './application/use-cases/create-order.use-case';
import { FindOrderByIdUseCase } from './application/use-cases/find-order-by-id.use-case';
import { GetOrderHistoryUseCase } from './application/use-cases/get-order-history.use-case';
import { ListCustomerOrdersUseCase } from './application/use-cases/list-customer-orders.use-case';
import { ListOrdersUseCase } from './application/use-cases/list-orders.use-case';
import { OrdersController } from './presentation/controllers/orders.controller';

@Module({
  imports: [OrdersInfrastructureModule],
  controllers: [OrdersController],
  providers: [
    CreateOrderUseCase,
    ListOrdersUseCase,
    ListCustomerOrdersUseCase,
    FindOrderByIdUseCase,
    GetOrderHistoryUseCase,
    CancelOrderUseCase,
  ],
  exports: [ListOrdersUseCase, ListCustomerOrdersUseCase, FindOrderByIdUseCase],
})
export class OrdersModule {}
