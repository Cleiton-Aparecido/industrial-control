import { Injectable } from '@nestjs/common';
import { StockMovementType } from 'src/infra/stock/entities/stock-movement.entity';
import { StockMovementDto } from '../dto/stock.dto';
import { StockService } from 'src/infra/stock/services/stock.service';

@Injectable()
export class RegisterStockExitUseCase {
  constructor(private readonly stock: StockService) {}

  execute(input: StockMovementDto, actorId: string) {
    return this.stock.recordMovement(input, StockMovementType.EXIT, actorId);
  }
}
