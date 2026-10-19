import { Injectable } from '@nestjs/common';
import { OrderService } from '../../../../infra/orders/services/order.service';

@Injectable()
export class ListCustomerOrdersUseCase {
  constructor(private readonly orders: OrderService) {}

  execute(
    customerId: string,
    actorId: string,
    canReadAll: boolean,
    page = 1,
    limit = 25,
  ) {
    return this.orders.customerOrders(
      customerId,
      actorId,
      canReadAll,
      page,
      limit,
    );
  }
}
