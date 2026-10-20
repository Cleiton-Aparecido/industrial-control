import { Injectable } from '@nestjs/common';
import { ProductService } from 'src/infra/products/services/product.service';
import { ProductImageResponseService } from '../services/product-image-response.service';

@Injectable()
export class ListProductsUseCase {
  constructor(
    private readonly products: ProductService,
    private readonly imageResponses: ProductImageResponseService,
  ) {}

  async execute(page = 1, limit = 25, search?: string) {
    const result = await this.products.list(page, limit, search);
    return {
      ...result,
      items: await this.imageResponses.presentMany(result.items),
    };
  }
}
