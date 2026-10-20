import { Injectable } from '@nestjs/common';
import { UpdateProductDto } from '../dto/product.dto';
import { ProductService } from 'src/infra/products/services/product.service';
import { ProductImageResponseService } from '../services/product-image-response.service';

@Injectable()
export class UpdateProductUseCase {
  constructor(
    private readonly products: ProductService,
    private readonly imageResponses: ProductImageResponseService,
  ) {}

  async execute(id: string, input: UpdateProductDto, actorId: string) {
    return this.imageResponses.present(
      await this.products.update(id, input, actorId),
    );
  }
}
