import { Module } from '@nestjs/common';
import { IProductRepository } from './abstract/product.repository';
import { ProductRepository } from './impl/product.repository';
import { ProductService } from './services/product.service';
import { AuditLogInfrastructureModule } from '../data/audit-log.module';
import { DataModule } from '../data/data.module';

@Module({
  imports: [DataModule, AuditLogInfrastructureModule],
  providers: [
    ProductService,
    { provide: IProductRepository, useClass: ProductRepository },
  ],
  exports: [ProductService],
})
export class ProductsInfrastructureModule {}
