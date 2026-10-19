import { ConflictException, Injectable } from '@nestjs/common';
import { OrderStatus } from 'src/infra/orders/entities/order.entity';
import { OrderItemEntity } from 'src/infra/orders/entities/order-item.entity';
import {
  StockMovementEntity,
  StockMovementType,
} from 'src/infra/stock/entities/stock-movement.entity';
import { fromMilliUnits, toMilliUnits } from 'src/infra/stock/stock-quantity';
import { OperationsUseCaseSupport } from 'src/modules/operations/application/services/operations-use-case-support';

@Injectable()
export class LogisticsService extends OperationsUseCaseSupport {
  async startProcessing(id: string, actorId: string, notes?: string) {
    return this.transition(
      id,
      actorId,
      OrderStatus.PENDING,
      OrderStatus.PROCESSING,
      notes,
      (order) => {
        order.assignedToUserId = actorId;
        order.processingStartedAt = new Date();
      },
    );
  }

  async readyForShipment(id: string, actorId: string, notes?: string) {
    return this.transition(
      id,
      actorId,
      OrderStatus.PROCESSING,
      OrderStatus.READY_FOR_SHIPMENT,
      notes,
      (order) => {
        order.readyForShipmentAt = new Date();
      },
      true,
    );
  }

  async dispatch(id: string, actorId: string, notes?: string) {
    return this.dataSource.transaction(async (manager) => {
      const order = await this.lockOrder(manager, id);
      if (order.status === OrderStatus.IN_TRANSIT) {
        this.assertTransition(order, OrderStatus.IN_TRANSIT, actorId, true);
        return this.orderResponse(manager, order);
      }
      this.assertTransition(
        order,
        OrderStatus.READY_FOR_SHIPMENT,
        actorId,
        true,
      );
      const items = await manager.find(OrderItemEntity, {
        where: { orderId: id },
      });
      for (const item of items.sort((a, b) =>
        a.productId.localeCompare(b.productId),
      )) {
        const balance = await this.lockBalance(manager, item.productId);
        const quantity = toMilliUnits(item.quantity);
        const onHandBefore = toMilliUnits(balance.quantityOnHand);
        const reservedBefore = toMilliUnits(balance.quantityReserved);
        if (onHandBefore < quantity || reservedBefore < quantity) {
          throw new ConflictException(
            'Saldo reservado inconsistente para expedição',
          );
        }
        balance.quantityOnHand = fromMilliUnits(onHandBefore - quantity);
        balance.quantityReserved = fromMilliUnits(reservedBefore - quantity);
        await manager.save(balance);
        await manager.getRepository(StockMovementEntity).save({
          productId: item.productId,
          movementType: StockMovementType.EXIT,
          quantity: item.quantity,
          quantityBefore: fromMilliUnits(onHandBefore),
          quantityAfter: balance.quantityOnHand,
          reservedBefore: fromMilliUnits(reservedBefore),
          reservedAfter: balance.quantityReserved,
          reason: `Baixa no despacho do pedido ${id}`,
          referenceType: 'ORDER',
          referenceId: id,
          idempotencyKey: `order:${id}:dispatch:${item.productId}`,
          performedByUserId: actorId,
        });
      }
      const previous = order.status;
      order.status = OrderStatus.IN_TRANSIT;
      order.shippedAt = new Date();
      await manager.save(order);
      await this.recordTransition(manager, order, previous, actorId, notes);
      await this.audit(manager, actorId, 'order.dispatched', 'order', id);
      return this.orderResponse(manager, order);
    });
  }

  async confirmDelivery(id: string, actorId: string, notes?: string) {
    return this.transition(
      id,
      actorId,
      OrderStatus.IN_TRANSIT,
      OrderStatus.DELIVERED,
      notes,
      (order) => {
        order.deliveredAt = new Date();
        order.deliveryNotes = notes ?? null;
      },
      true,
    );
  }
}
