import { Module } from '@nestjs/common';
import { StockInfrastructureModule } from 'src/infra/stock/stock.module';
import { CorrectStockMovementUseCase } from './application/use-cases/correct-stock-movement.use-case';
import { FindStockMovementByIdUseCase } from './application/use-cases/find-stock-movement-by-id.use-case';
import { GetProductStockBalanceUseCase } from './application/use-cases/get-product-stock-balance.use-case';
import { ListStockBalancesUseCase } from './application/use-cases/list-stock-balances.use-case';
import { ListStockMovementsUseCase } from './application/use-cases/list-stock-movements.use-case';
import { AdjustStockUseCase } from './application/use-cases/adjust-stock.use-case';
import { RegisterStockEntryUseCase } from './application/use-cases/register-stock-entry.use-case';
import { RegisterStockExitUseCase } from './application/use-cases/register-stock-exit.use-case';
import { StockController } from './presentation/controllers/stock.controller';

@Module({
  imports: [StockInfrastructureModule],
  controllers: [StockController],
  providers: [
    GetProductStockBalanceUseCase,
    ListStockBalancesUseCase,
    RegisterStockEntryUseCase,
    RegisterStockExitUseCase,
    AdjustStockUseCase,
    ListStockMovementsUseCase,
    FindStockMovementByIdUseCase,
    CorrectStockMovementUseCase,
  ],
  exports: [GetProductStockBalanceUseCase, ListStockMovementsUseCase],
})
export class StockModule {}
