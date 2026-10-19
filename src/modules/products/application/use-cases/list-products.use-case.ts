import { Injectable } from '@nestjs/common';
import { ProductService } from 'src/infra/products/services/product.service';

@Injectable()
export class ListProductsUseCase {
  constructor(private readonly products: ProductService) {}

  execute(page = 1, limit = 25, search?: string) {
    return this.products.list(page, limit, search);
  }
}
