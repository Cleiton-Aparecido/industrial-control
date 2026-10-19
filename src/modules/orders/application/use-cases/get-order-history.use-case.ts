import { Injectable } from '@nestjs/common';
import { OrderService } from '../../../../infra/orders/services/order.service';

@Injectable()
export class GetOrderHistoryUseCase {
  constructor(private readonly orders: OrderService) {}

  execute(id: string, actorId: string, canReadAll: boolean) {
    return this.orders.history(id, actorId, canReadAll);
  }
}
