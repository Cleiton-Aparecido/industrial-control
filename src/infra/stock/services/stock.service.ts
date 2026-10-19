import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { IStockRepository } from '../abstract/stock.repository';
import { StockMovementType } from 'src/infra/stock/entities/stock-movement.entity';

import { toMilliUnits } from '../stock-quantity';
import {
  CorrectStockMovementDto,
  StockMovementDto,
  StockMovementQueryDto,
} from 'src/modules/stock/application/dto/stock.dto';

@Injectable()
export class StockService {
  constructor(
    @Inject(IStockRepository)
    private readonly stock: IStockRepository,
  ) {}

  async productBalance(productId: string) {
    const product = await this.stock.findProductById(productId);
    if (!product) throw new NotFoundException('Produto não encontrado');
    const balance = await this.stock.findBalanceByProduct(productId);
    return (
      balance ?? {
        productId,
        quantityOnHand: '0.000',
        quantityReserved: '0.000',
      }
    );
  }

  async listBalances(page = 1, limit = 25) {
    const { items, total } = await this.stock.listBalances(page, limit);
    return { items, total, page, limit };
  }

  async recordMovement(
    input: StockMovementDto,
    type: StockMovementType,
    actorId: string,
    reference?: { type: string; id: string },
  ) {
    const isAdjustment =
      type === StockMovementType.ADJUSTMENT_IN ||
      type === StockMovementType.ADJUSTMENT_OUT;
    if (isAdjustment !== Boolean(input.movementType)) {
      throw new BadRequestException(
        'Tipo de movimentação incompatível com a operação',
      );
    }
    if (isAdjustment && input.movementType !== type) {
      throw new BadRequestException('Tipo de ajuste incompatível');
    }
    const quantity = toMilliUnits(input.quantity);
    if (quantity <= 0n) {
      throw new BadRequestException('A quantidade deve ser positiva');
    }
    return this.stock.recordMovement(input, type, actorId, reference);
  }

  async listMovements(filters: StockMovementQueryDto, page = 1, limit = 25) {
    this.validateDateRange(filters.from, filters.to);
    const { items, total } = await this.stock.listMovements(
      filters,
      page,
      limit,
    );
    return { items, total, page, limit };
  }

  async getMovement(id: string) {
    const movement = await this.stock.findMovementById(id);
    if (!movement) throw new NotFoundException('Movimentação não encontrada');
    return movement;
  }

  async correctMovement(
    id: string,
    input: CorrectStockMovementDto,
    actorId: string,
  ) {
    const original = await this.getMovement(id);
    if (original.referenceType === 'STOCK_MOVEMENT') {
      throw new ConflictException('Não é permitido corrigir uma correção');
    }
    const correctionType =
      original.movementType === StockMovementType.ENTRY ||
      original.movementType === StockMovementType.ADJUSTMENT_IN
        ? StockMovementType.ADJUSTMENT_OUT
        : original.movementType === StockMovementType.EXIT ||
            original.movementType === StockMovementType.ADJUSTMENT_OUT
          ? StockMovementType.ADJUSTMENT_IN
          : null;
    if (!correctionType) {
      throw new ConflictException(
        'Reservas e liberações são corrigidas pelo fluxo do pedido',
      );
    }
    return this.recordMovement(
      {
        productId: original.productId,
        quantity: original.quantity,
        reason: input.reason,
        movementType: correctionType,
        idempotencyKey: `correction:${original.id}`,
      },
      correctionType,
      actorId,
      { type: 'STOCK_MOVEMENT', id: original.id },
    );
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
