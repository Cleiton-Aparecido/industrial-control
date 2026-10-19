import { Injectable } from '@nestjs/common';
import { StockService } from 'src/infra/stock/services/stock.service';

@Injectable()
export class ListStockBalancesUseCase {
  constructor(private readonly stock: StockService) {}

  execute(page = 1, limit = 25) {
    return this.stock.listBalances(page, limit);
  }
}
