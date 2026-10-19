import { Module } from '@nestjs/common';
import { IOrderRepository } from './abstract/order.repository';
import { OrderRepository } from './impl/order.repository';
import { OrderService } from './services/order.service';
import { DataModule } from '../data/data.module';

@Module({
  imports: [DataModule],
  providers: [
    OrderService,
    { provide: IOrderRepository, useClass: OrderRepository },
  ],
  exports: [OrderService],
})
export class OrdersInfrastructureModule {}
