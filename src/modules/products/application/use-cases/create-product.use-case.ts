import { Injectable, Logger } from '@nestjs/common';
import { CreateProductDto } from '../dto/product.dto';
import { ProductService } from 'src/infra/products/services/product.service';
import { IFileStorage } from 'src/infra/storage/abstract/file-storage';
import { ProductImageProcessor } from '../services/product-image-processor';
import { ProductImageResponseService } from '../services/product-image-response.service';
import { ProductEntity } from 'src/infra/products/entities/product.entity';

const logger = new Logger('CreateProductUseCase');

@Injectable()
export class CreateProductUseCase {
  constructor(
    private readonly products: ProductService,
    private readonly imageProcessor: ProductImageProcessor,
    private readonly imageResponses: ProductImageResponseService,
    private readonly storage: IFileStorage,
  ) {}

  async execute(input: CreateProductDto, actorId: string) {
    const images = this.imageProcessor.prepare(input.images);
    const productInput = { ...input };
    delete productInput.images;
    const uploaded: {
      path: string;
      contentType: (typeof images)[number]['contentType'];
    }[] = [];
    let product: ProductEntity;

    try {
      for (const image of images) {
        const stored = await this.storage.uploadProductImage(
          image.buffer,
          image.contentType,
          image.extension,
        );
        uploaded.push({ path: stored.path, contentType: image.contentType });
      }

      product = await this.products.create(productInput, actorId, uploaded);
    } catch (error) {
      await Promise.all(
        uploaded.map(async ({ path }) => {
          try {
            await this.storage.delete(path);
          } catch {
            logger.warn(
              `Storage compensation failed for product image path: ${path}`,
            );
          }
        }),
      );
      throw error;
    }

    return this.imageResponses.present(product);
  }
}
