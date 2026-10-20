import { Injectable } from '@nestjs/common';
import { ProductService } from 'src/infra/products/services/product.service';
import { ProductImageResponseService } from '../services/product-image-response.service';

@Injectable()
export class SetProductActiveUseCase {
  constructor(
    private readonly products: ProductService,
    private readonly imageResponses: ProductImageResponseService,
  ) {}

  async execute(id: string, isActive: boolean, actorId: string) {
    return this.imageResponses.present(
      await this.products.setActive(id, isActive, actorId),
    );
  }
}
