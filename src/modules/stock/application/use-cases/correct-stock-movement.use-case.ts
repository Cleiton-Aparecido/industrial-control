import { Injectable } from '@nestjs/common';
import { CorrectStockMovementDto } from '../dto/stock.dto';
import { StockService } from 'src/infra/stock/services/stock.service';

@Injectable()
export class CorrectStockMovementUseCase {
  constructor(private readonly stock: StockService) {}

  execute(id: string, input: CorrectStockMovementDto, actorId: string) {
    return this.stock.correctMovement(id, input, actorId);
  }
}
