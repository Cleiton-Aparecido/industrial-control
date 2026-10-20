import { Injectable } from '@nestjs/common';
import { ProductService } from 'src/infra/products/services/product.service';
import { ProductImageResponseService } from '../services/product-image-response.service';

@Injectable()
export class FindProductByIdUseCase {
  constructor(
    private readonly products: ProductService,
    private readonly imageResponses: ProductImageResponseService,
  ) {}

  async execute(id: string) {
    return this.imageResponses.present(await this.products.get(id));
  }
}
