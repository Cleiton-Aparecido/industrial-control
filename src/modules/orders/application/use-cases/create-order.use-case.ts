import { Injectable } from '@nestjs/common';
import { CreateOrderDto } from '../dto/order.dto';
import { OrderService } from '../../../../infra/orders/services/order.service';

@Injectable()
export class CreateOrderUseCase {
  constructor(private readonly orders: OrderService) {}

  execute(input: CreateOrderDto, actorId: string, idempotencyKey?: string) {
    return this.orders.create(input, actorId, idempotencyKey);
  }
}
