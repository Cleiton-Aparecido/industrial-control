import { Injectable } from '@nestjs/common';
import { CreateProductDto } from '../dto/product.dto';
import { ProductService } from 'src/infra/products/services/product.service';

@Injectable()
export class CreateProductUseCase {
  constructor(private readonly products: ProductService) {}

  execute(input: CreateProductDto, actorId: string) {
    return this.products.create(input, actorId);
  }
}
