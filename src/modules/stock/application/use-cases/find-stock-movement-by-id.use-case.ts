import { Injectable } from '@nestjs/common';
import { StockService } from 'src/infra/stock/services/stock.service';

@Injectable()
export class FindStockMovementByIdUseCase {
  constructor(private readonly stock: StockService) {}

  execute(id: string) {
    return this.stock.getMovement(id);
  }
}
