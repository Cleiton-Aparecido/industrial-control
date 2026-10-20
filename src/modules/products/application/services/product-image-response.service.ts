import { Injectable } from '@nestjs/common';
import { IFileStorage } from 'src/infra/storage/abstract/file-storage';
import { ProductEntity } from 'src/infra/products/entities/product.entity';

@Injectable()
export class ProductImageResponseService {
  constructor(private readonly storage: IFileStorage) {}

  async present(product: ProductEntity) {
    const [result] = await this.presentMany([product]);
    return result;
  }

  async presentMany(products: ProductEntity[]) {
    const images = products.flatMap((product) => product.images ?? []);
    const urls = await this.storage.getUrls(images.map((image) => image.path));
    let urlIndex = 0;

    return products.map((product) => {
      const { images: productImages = [], ...productData } = product;
      return {
        ...productData,
        images: productImages.map((image) => ({
          id: image.id,
          url: urls[urlIndex++],
          contentType: image.contentType,
        })),
      };
    });
  }
}
