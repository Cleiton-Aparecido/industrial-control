import { Module } from '@nestjs/common';
import { OperationsModule } from 'src/modules/operations/operations.module';
import { OrdersModule } from 'src/modules/orders/orders.module';
import { ConfirmOrderDeliveryUseCase } from './application/use-cases/confirm-order-delivery.use-case';
import { DispatchOrderUseCase } from './application/use-cases/dispatch-order.use-case';
import { ReadyOrderForShipmentUseCase } from './application/use-cases/ready-order-for-shipment.use-case';
import { StartOrderProcessingUseCase } from './application/use-cases/start-order-processing.use-case';
import { LogisticsService } from './application/services/logistics.service';
import { LogisticsController } from './presentation/controllers/logistics.controller';

@Module({
  imports: [OperationsModule, OrdersModule],
  controllers: [LogisticsController],
  providers: [
    LogisticsService,
    StartOrderProcessingUseCase,
    ReadyOrderForShipmentUseCase,
    DispatchOrderUseCase,
    ConfirmOrderDeliveryUseCase,
  ],
})
export class LogisticsModule {}
