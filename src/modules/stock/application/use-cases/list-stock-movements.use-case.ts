import { Injectable } from '@nestjs/common';
import { StockMovementQueryDto } from '../dto/stock.dto';
import { StockService } from 'src/infra/stock/services/stock.service';

@Injectable()
export class ListStockMovementsUseCase {
  constructor(private readonly stock: StockService) {}

  execute(filters: StockMovementQueryDto, page = 1, limit = 25) {
    return this.stock.listMovements(filters, page, limit);
  }
}
