import { Injectable } from '@nestjs/common';
import { ProductService } from 'src/infra/products/services/product.service';

@Injectable()
export class FindProductByIdUseCase {
  constructor(private readonly products: ProductService) {}

  execute(id: string) {
    return this.products.get(id);
  }
}
