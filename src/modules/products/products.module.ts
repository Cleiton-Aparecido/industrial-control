import { Module } from '@nestjs/common';
import { ProductsInfrastructureModule } from 'src/infra/products/products.module';
import { OperationsModule } from 'src/modules/operations/operations.module';
import { StockModule } from 'src/modules/stock/stock.module';
import { SupabaseStorageModule } from 'src/infra/storage/supabase/supabase-storage.module';
import { ProductImageProcessor } from './application/services/product-image-processor';
import { ProductImageResponseService } from './application/services/product-image-response.service';
import { CreateProductUseCase } from './application/use-cases/create-product.use-case';
import { FindProductByIdUseCase } from './application/use-cases/find-product-by-id.use-case';
import { ListProductsUseCase } from './application/use-cases/list-products.use-case';
import { ListPublicProductsUseCase } from './application/use-cases/list-public-products.use-case';
import { SetProductActiveUseCase } from './application/use-cases/set-product-active.use-case';
import { UpdateProductUseCase } from './application/use-cases/update-product.use-case';
import { ProductsController } from './presentation/controllers/products.controller';

@Module({
  imports: [
    ProductsInfrastructureModule,
    SupabaseStorageModule,
    OperationsModule,
    StockModule,
  ],
  controllers: [ProductsController],
  providers: [
    CreateProductUseCase,
    ListProductsUseCase,
    ListPublicProductsUseCase,
    FindProductByIdUseCase,
    UpdateProductUseCase,
    SetProductActiveUseCase,
    ProductImageProcessor,
    ProductImageResponseService,
  ],
})
export class ProductsModule {}
