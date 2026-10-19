import { Injectable } from '@nestjs/common';
import { OrderService } from '../../../../infra/orders/services/order.service';

@Injectable()
export class CancelOrderUseCase {
  constructor(private readonly orders: OrderService) {}

  execute(id: string, actorId: string, canCancelAny: boolean, notes?: string) {
    return this.orders.cancel(id, actorId, canCancelAny, notes);
  }
}
