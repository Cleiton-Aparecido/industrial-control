import { Injectable } from '@nestjs/common';
import { OrderService } from '../../../../infra/orders/services/order.service';

@Injectable()
export class FindOrderByIdUseCase {
  constructor(private readonly orders: OrderService) {}

  execute(id: string, actorId: string, canReadAll: boolean) {
    return this.orders.get(id, actorId, canReadAll);
  }
}
