import { Injectable } from '@nestjs/common';
import { ProductService } from 'src/infra/products/services/product.service';

@Injectable()
export class SetProductActiveUseCase {
  constructor(private readonly products: ProductService) {}

  execute(id: string, isActive: boolean, actorId: string) {
    return this.products.setActive(id, isActive, actorId);
  }
}
