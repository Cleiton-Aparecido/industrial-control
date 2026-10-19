import { Module } from '@nestjs/common';
import { ProductsInfrastructureModule } from 'src/infra/products/products.module';
import { OperationsModule } from 'src/modules/operations/operations.module';
import { StockModule } from 'src/modules/stock/stock.module';
import { CreateProductUseCase } from './application/use-cases/create-product.use-case';
import { FindProductByIdUseCase } from './application/use-cases/find-product-by-id.use-case';
import { ListProductsUseCase } from './application/use-cases/list-products.use-case';
import { SetProductActiveUseCase } from './application/use-cases/set-product-active.use-case';
import { UpdateProductUseCase } from './application/use-cases/update-product.use-case';
import { ProductsController } from './presentation/controllers/products.controller';

@Module({
  imports: [ProductsInfrastructureModule, OperationsModule, StockModule],
  controllers: [ProductsController],
  providers: [
    CreateProductUseCase,
    ListProductsUseCase,
    FindProductByIdUseCase,
    UpdateProductUseCase,
    SetProductActiveUseCase,
  ],
})
export class ProductsModule {}
