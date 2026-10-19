import { BadRequestException, Injectable } from '@nestjs/common';
import { StockMovementType } from 'src/infra/stock/entities/stock-movement.entity';
import { StockMovementDto } from '../dto/stock.dto';
import { StockService } from 'src/infra/stock/services/stock.service';

@Injectable()
export class AdjustStockUseCase {
  constructor(private readonly stock: StockService) {}

  execute(input: StockMovementDto, actorId: string) {
    if (!input.movementType) {
      throw new BadRequestException('Informe ADJUSTMENT_IN ou ADJUSTMENT_OUT');
    }
    const movementType = input.movementType as
      StockMovementType.ADJUSTMENT_IN | StockMovementType.ADJUSTMENT_OUT;
    return this.stock.recordMovement(input, movementType, actorId);
  }
}
