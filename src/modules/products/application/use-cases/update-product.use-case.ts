import { Injectable } from '@nestjs/common';
import { UpdateProductDto } from '../dto/product.dto';
import { ProductService } from 'src/infra/products/services/product.service';

@Injectable()
export class UpdateProductUseCase {
  constructor(private readonly products: ProductService) {}

  execute(id: string, input: UpdateProductDto, actorId: string) {
    return this.products.update(id, input, actorId);
  }
}
