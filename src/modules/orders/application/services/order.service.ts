import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isUniqueConstraintViolation } from 'src/infra/data/is-unique-constraint-violation';
import { CustomerEntity } from 'src/infra/customers/entities/customer.entity';
import {
  OrderEntity,
  OrderStatus,
} from 'src/infra/orders/entities/order.entity';
import { OrderItemEntity } from 'src/infra/orders/entities/order-item.entity';
import { OrderStatusHistoryEntity } from 'src/infra/orders/entities/order-status-history.entity';
import { ProductEntity } from 'src/infra/products/entities/product.entity';
import {
  fromMinorUnits,
  multiplyPriceByMilliQuantity,
  toMinorUnits,
} from 'src/infra/money/money';
import {
  StockMovementEntity,
  StockMovementType,
} from 'src/infra/stock/entities/stock-movement.entity';
import { fromMilliUnits, toMilliUnits } from 'src/infra/stock/stock-quantity';
import { OperationsUseCaseSupport } from 'src/modules/operations/application/services/operations-use-case-support';
import { CreateOrderDto } from '../dto/order.dto';

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
export class OrderService extends OperationsUseCaseSupport {
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
      return await this.dataSource.transaction(async (manager) => {
        if (normalizedKey) {
          await manager.query(
            'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
            [normalizedKey],
          );
          const existing = await manager.findOne(OrderEntity, {
            where: { idempotencyKey: normalizedKey },
          });
          if (existing) {
            throw new ConflictException(DUPLICATE_ORDER_MESSAGE);
          }
        }

        const customer = await manager.findOne(CustomerEntity, {
          where: { id: input.customerId },
        });
        if (!customer) throw new NotFoundException('Cliente não encontrado');
        if (!customer.isActive) throw new ConflictException('Cliente inativo');

        const balances = new Map<
          string,
          Awaited<ReturnType<typeof this.lockBalance>>
        >();
        const products = new Map<string, ProductEntity>();
        for (const productId of [...requested.keys()].sort()) {
          const product = await this.getProductWithManager(manager, productId);
          if (!product.isActive) {
            throw new ConflictException(`Produto inativo: ${product.name}`);
          }
          products.set(productId, product);
          balances.set(productId, await this.lockBalance(manager, productId));
        }

        const orderLines = new Map<
          string,
          { productId: string; quantity: bigint; unitPriceSnapshot: string }
        >();
        for (const item of input.items) {
          const product = products.get(item.productId)!;
          const unitPriceSnapshot = fromMinorUnits(
            toMinorUnits(item.unitPrice ?? product.price),
          );
          const lineKey = `${item.productId}:${unitPriceSnapshot}`;
          const existingLine = orderLines.get(lineKey);
          orderLines.set(lineKey, {
            productId: item.productId,
            quantity:
              (existingLine?.quantity ?? 0n) + toMilliUnits(item.quantity),
            unitPriceSnapshot,
          });
        }

        for (const [productId, quantity] of requested) {
          const balance = balances.get(productId)!;
          if (
            toMilliUnits(balance.quantityOnHand) -
              toMilliUnits(balance.quantityReserved) <
            quantity
          ) {
            const product = await manager.findOneBy(ProductEntity, {
              id: productId,
            });
            throw new ConflictException(
              `Estoque insuficiente para ${product?.name ?? productId}`,
            );
          }
        }

        const order = await manager.save(
          OrderEntity,
          manager.create(OrderEntity, {
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
          }),
        );
        const orderItems = manager.getRepository(OrderItemEntity);
        const movements = manager.getRepository(StockMovementEntity);
        for (const [productId, quantity] of requested) {
          const balance = balances.get(productId)!;
          const reservedBefore = toMilliUnits(balance.quantityReserved);
          balance.quantityReserved = fromMilliUnits(reservedBefore + quantity);
          await manager.save(balance);
          await movements.save({
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
        for (const line of orderLines.values()) {
          const product = products.get(line.productId)!;
          await orderItems.save({
            orderId: order.id,
            productId: line.productId,
            productNameSnapshot: product.name,
            productSkuSnapshot: product.sku,
            unitSnapshot: product.unit,
            quantity: fromMilliUnits(line.quantity),
            unitPriceSnapshot: line.unitPriceSnapshot,
          });
        }
        await manager.getRepository(OrderStatusHistoryEntity).save({
          orderId: order.id,
          previousStatus: null,
          newStatus: OrderStatus.PENDING,
          changedByUserId: actorId,
          notes: 'Pedido criado e enviado para a fila logística',
        });
        await this.audit(manager, actorId, 'order.created', 'order', order.id, {
          itemCount: orderLines.size,
          totalAmount: fromMinorUnits(
            [...orderLines.values()].reduce(
              (total, line) =>
                total +
                multiplyPriceByMilliQuantity(
                  toMinorUnits(line.unitPriceSnapshot),
                  line.quantity,
                ),
              0n,
            ),
          ),
        });
        return this.orderResponse(manager, order);
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
    const query = this.dataSource
      .getRepository(OrderEntity)
      .createQueryBuilder('order')
      .orderBy('order.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);
    if (actorId && !canReadAll) {
      query.andWhere('order.createdByUserId = :actorId', { actorId });
    }
    if (customerId) {
      query.andWhere('order.customerId = :customerId', { customerId });
    }
    if (status) query.andWhere('order.status = :status', { status });
    if (createdByUserId) {
      query.andWhere('order.createdByUserId = :createdByUserId', {
        createdByUserId,
      });
    }
    if (from) query.andWhere('order.createdAt >= :from', { from });
    if (to) query.andWhere('order.createdAt <= :to', { to });
    const [items, total] = await query.getManyAndCount();
    const withItems = await Promise.all(
      items.map((order) => this.orderResponse(this.dataSource.manager, order)),
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
    const customer = await this.dataSource
      .getRepository(CustomerEntity)
      .findOneBy({ id: customerId });
    if (!customer) throw new NotFoundException('Cliente não encontrado');
    return this.list(page, limit, actorId, canReadAll, customerId);
  }

  async get(id: string, actorId: string, canReadAll: boolean) {
    const order = await this.dataSource
      .getRepository(OrderEntity)
      .findOneBy({ id });
    if (!order) throw new NotFoundException('Pedido não encontrado');
    if (!canReadAll && order.createdByUserId !== actorId) {
      throw new ForbiddenException('Pedido fora do escopo do usuário');
    }
    return this.orderResponse(this.dataSource.manager, order);
  }

  async history(id: string, actorId: string, canReadAll: boolean) {
    await this.get(id, actorId, canReadAll);
    return this.dataSource.getRepository(OrderStatusHistoryEntity).find({
      where: { orderId: id },
      order: { createdAt: 'ASC' },
    });
  }

  async cancel(
    id: string,
    actorId: string,
    canCancelAny: boolean,
    notes?: string,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const order = await this.lockOrder(manager, id);
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
      const items = await manager.find(OrderItemEntity, {
        where: { orderId: id },
      });
      for (const item of items.sort((a, b) =>
        a.productId.localeCompare(b.productId),
      )) {
        const balance = await this.lockBalance(manager, item.productId);
        const reservedBefore = toMilliUnits(balance.quantityReserved);
        const quantity = toMilliUnits(item.quantity);
        if (reservedBefore < quantity) {
          throw new ConflictException(
            'Reserva de estoque inconsistente para o pedido',
          );
        }
        balance.quantityReserved = fromMilliUnits(reservedBefore - quantity);
        await manager.save(balance);
        await manager.getRepository(StockMovementEntity).save({
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
      await manager.save(order);
      await this.recordTransition(
        manager,
        order,
        previousStatus,
        actorId,
        notes,
      );
      await this.audit(manager, actorId, 'order.cancelled', 'order', id);
      return this.orderResponse(manager, order);
    });
  }
}
