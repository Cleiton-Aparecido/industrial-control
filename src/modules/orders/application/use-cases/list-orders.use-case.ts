import { Injectable } from '@nestjs/common';
import { OrderService } from '../../../../infra/orders/services/order.service';

@Injectable()
export class ListOrdersUseCase {
  constructor(private readonly orders: OrderService) {}

  execute(
    page = 1,
    limit = 25,
    actorId?: string,
    canReadAll = false,
    customerId?: string,
    status?: string,
    createdByUserId?: string,
    from?: string,
    to?: string,
  ) {
    return this.orders.list(
      page,
      limit,
      actorId,
      canReadAll,
      customerId,
      status,
      createdByUserId,
      from,
      to,
    );
  }
}
