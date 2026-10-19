import { Injectable } from '@nestjs/common';
import { StockService } from 'src/infra/stock/services/stock.service';

@Injectable()
export class GetProductStockBalanceUseCase {
  constructor(private readonly stock: StockService) {}

  execute(productId: string) {
    return this.stock.productBalance(productId);
  }
}
