import { Module } from '@nestjs/common';
import { IStockRepository } from './abstract/stock.repository';
import { StockRepository } from './impl/stock.repository';
import { StockService } from './services/stock.service';
import { DataModule } from '../data/data.module';

@Module({
  imports: [DataModule],
  providers: [
    StockService,
    { provide: IStockRepository, useClass: StockRepository },
  ],
  exports: [StockService],
})
export class StockInfrastructureModule {}
