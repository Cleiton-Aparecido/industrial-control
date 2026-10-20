import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isUniqueConstraintViolation } from 'src/infra/data/is-unique-constraint-violation';
import { IOrderRepository } from '../abstract/order.repository';
import { OrderStatus } from 'src/infra/orders/entities/order.entity';
import { StockBalanceEntity } from 'src/infra/stock/entities/stock-balance.entity';
import { StockMovementType } from 'src/infra/stock/entities/stock-movement.entity';
import { CreateOrderDto } from '../../../modules/orders/application/dto/order.dto';
import { fromMilliUnits, toMilliUnits } from 'src/infra/stock/stock-quantity';

const DUPLICATE_ORDER_MESSAGE =
  'Operação duplicada: já existe um pedido criado com esta Idempotency-Key.';

function isIdempotencyConstraint(error: unknown): boolean {
  const e = error as {
    constraint?: string;
    driverError?: { constraint?: string };
  };
  return (
    (e.constraint ?? e.driverError?.constraint) === 'UQ_orders_idempotency_key'
  );
}

@Injectable()
export class OrderService {
  constructor(
    @Inject(IOrderRepository)
    private readonly orders: IOrderRepository,
  ) {}

  async create(
    input: CreateOrderDto,
    actorId: string,
    idempotencyKey?: string,
  ) {
    const normalizedKey = idempotencyKey?.trim() || null;
    if (normalizedKey && normalizedKey.length > 150) {
      throw new BadRequestException('Idempotency-Key excede 150 caracteres');
    }
    const requested = new Map<string, bigint>();
    for (const item of input.items) {
      const quantity = toMilliUnits(item.quantity);
      if (quantity <= 0n) {
        throw new BadRequestException('As quantidades devem ser positivas');
      }
      requested.set(
        item.productId,
        (requested.get(item.productId) ?? 0n) + quantity,
      );
    }

    try {
      return await this.orders.transaction(async (manager) => {
        if (normalizedKey) {
          await manager.lockIdempotencyKey(normalizedKey);
          const existing = await manager.findByIdempotencyKey(normalizedKey);
          if (existing) {
            throw new ConflictException(DUPLICATE_ORDER_MESSAGE);
          }
        }

        const customer = await manager.findCustomerById(input.customerId);
        if (!customer) throw new NotFoundException('Cliente não encontrado');
        if (!customer.isActive) throw new ConflictException('Cliente inativo');

        const balances = new Map<string, StockBalanceEntity>();
        for (const productId of [...requested.keys()].sort()) {
          const product = await manager.findProductById(productId);
          if (!product) throw new NotFoundException('Produto não encontrado');
          if (!product.isActive) {
            throw new ConflictException(`Produto inativo: ${product.name}`);
          }
          balances.set(productId, await manager.lockBalance(productId));
        }

        for (const [productId, quantity] of requested) {
          const balance = balances.get(productId)!;
          if (
            toMilliUnits(balance.quantityOnHand) -
              toMilliUnits(balance.quantityReserved) <
            quantity
          ) {
            const product = await manager.findProductById(productId);
            throw new ConflictException(
              `Estoque insuficiente para ${product?.name ?? productId}`,
            );
          }
        }

        const order = await manager.saveOrder({
          customerId: customer.id,
          createdByUserId: actorId,
          idempotencyKey: normalizedKey,
          status: OrderStatus.PENDING,
          customerNameSnapshot: customer.name,
          customerDocumentSnapshot: customer.documentNumber,
          deliveryAddressSnapshot:
            input.deliveryAddressSnapshot ?? customer.address,
          customerNotes: input.customerNotes ?? null,
          internalNotes: null,
          assignedToUserId: null,
        });
        for (const [productId, quantity] of requested) {
          const product = await manager.findProductById(productId);
          if (!product) throw new NotFoundException('Produto não encontrado');
          const balance = balances.get(productId)!;
          const reservedBefore = toMilliUnits(balance.quantityReserved);
          balance.quantityReserved = fromMilliUnits(reservedBefore + quantity);
          await manager.saveBalance(balance);
          await manager.saveItem({
            orderId: order.id,
            productId,
            productNameSnapshot: product.name,
            productSkuSnapshot: product.sku,
            unitSnapshot: product.unit,
            quantity: fromMilliUnits(quantity),
          });
          await manager.saveMovement({
            productId,
            movementType: StockMovementType.RESERVATION,
            quantity: fromMilliUnits(quantity),
            quantityBefore: balance.quantityOnHand,
            quantityAfter: balance.quantityOnHand,
            reservedBefore: fromMilliUnits(reservedBefore),
            reservedAfter: balance.quantityReserved,
            reason: `Reserva do pedido ${order.id}`,
            referenceType: 'ORDER',
            referenceId: order.id,
            idempotencyKey: `order:${order.id}:reserve:${productId}`,
            performedByUserId: actorId,
          });
        }
        await manager.saveHistory({
          orderId: order.id,
          previousStatus: null,
          newStatus: OrderStatus.PENDING,
          changedByUserId: actorId,
          notes: 'Pedido criado e enviado para a fila logística',
        });
        await manager.audit(actorId, 'order.created', 'order', order.id, {
          itemCount: requested.size,
        });
        return manager.withItems(order);
      });
    } catch (error) {
      if (
        normalizedKey &&
        isUniqueConstraintViolation(error) &&
        isIdempotencyConstraint(error)
      ) {
        throw new ConflictException(DUPLICATE_ORDER_MESSAGE);
      }
      throw error;
    }
  }

  async list(
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
    this.validateDateRange(from, to);
    if (status && !Object.values(OrderStatus).includes(status as OrderStatus)) {
      throw new BadRequestException('Status de pedido inválido');
    }
    const { items, total } = await this.orders.list({
      actorId,
      canReadAll,
      customerId,
      status,
      createdByUserId,
      from,
      to,
      page,
      limit,
    });
    const withItems = await Promise.all(
      items.map((order) => this.orders.withItems(order)),
    );
    return { items: withItems, total, page, limit };
  }

  async customerOrders(
    customerId: string,
    actorId: string,
    canReadAll: boolean,
    page = 1,
    limit = 25,
  ) {
    const customer = await this.orders.findCustomerById(customerId);
    if (!customer) throw new NotFoundException('Cliente não encontrado');
    return this.list(page, limit, actorId, canReadAll, customerId);
  }

  async get(id: string, actorId: string, canReadAll: boolean) {
    const order = await this.orders.findById(id);
    if (!order) throw new NotFoundException('Pedido não encontrado');
    if (!canReadAll && order.createdByUserId !== actorId) {
      throw new ForbiddenException('Pedido fora do escopo do usuário');
    }
    return this.orders.withItems(order);
  }

  async history(id: string, actorId: string, canReadAll: boolean) {
    await this.get(id, actorId, canReadAll);
    return this.orders.findHistory(id);
  }

  async cancel(
    id: string,
    actorId: string,
    canCancelAny: boolean,
    notes?: string,
  ) {
    return this.orders.transaction(async (manager) => {
      const order = await manager.lockOrder(id);
      if (!order) throw new NotFoundException('Pedido não encontrado');
      if (!canCancelAny && order.createdByUserId !== actorId) {
        throw new ForbiddenException('Pedido fora do escopo do usuário');
      }
      if (
        [
          OrderStatus.DELIVERED,
          OrderStatus.CANCELLED,
          OrderStatus.IN_TRANSIT,
        ].includes(order.status)
      ) {
        throw new ConflictException(
          'Este pedido não pode ser cancelado neste status',
        );
      }
      const items = await manager.findItems(id);
      for (const item of items.sort((a, b) =>
        a.productId.localeCompare(b.productId),
      )) {
        const balance = await manager.lockBalance(item.productId);
        const reservedBefore = toMilliUnits(balance.quantityReserved);
        const quantity = toMilliUnits(item.quantity);
        if (reservedBefore < quantity) {
          throw new ConflictException(
            'Reserva de estoque inconsistente para o pedido',
          );
        }
        balance.quantityReserved = fromMilliUnits(reservedBefore - quantity);
        await manager.saveBalance(balance);
        await manager.saveMovement({
          productId: item.productId,
          movementType: StockMovementType.RELEASE,
          quantity: item.quantity,
          quantityBefore: balance.quantityOnHand,
          quantityAfter: balance.quantityOnHand,
          reservedBefore: fromMilliUnits(reservedBefore),
          reservedAfter: balance.quantityReserved,
          reason: `Liberação da reserva do pedido ${id}`,
          referenceType: 'ORDER',
          referenceId: id,
          idempotencyKey: `order:${id}:release:${item.productId}`,
          performedByUserId: actorId,
        });
      }
      const previousStatus = order.status;
      order.status = OrderStatus.CANCELLED;
      order.cancelledAt = new Date();
      await manager.saveOrder(order);
      await manager.saveHistory({
        orderId: order.id,
        previousStatus,
        newStatus: order.status,
        changedByUserId: actorId,
        notes: notes ?? null,
      });
      await manager.audit(actorId, 'order.cancelled', 'order', id);
      return manager.withItems(order);
    });
  }

  private validateDateRange(from?: string, to?: string) {
    if (from && Number.isNaN(Date.parse(from))) {
      throw new BadRequestException('Data inicial inválida');
    }
    if (to && Number.isNaN(Date.parse(to))) {
      throw new BadRequestException('Data final inválida');
    }
    if (from && to && Date.parse(from) > Date.parse(to)) {
      throw new BadRequestException(
        'A data inicial deve ser anterior à data final',
      );
    }
  }
}
