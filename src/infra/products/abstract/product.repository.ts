import { ProductEntity } from '../entities/product.entity';

export type CreateProductData = Pick<
  ProductEntity,
  'name' | 'description' | 'sku' | 'unit' | 'isActive'
>;

export type ProductPage = { items: ProductEntity[]; total: number };

export abstract class IProductRepository {
  abstract create(
    data: CreateProductData,
    actorId: string,
  ): Promise<ProductEntity>;
  abstract findPage(
    page: number,
    limit: number,
    search?: string,
  ): Promise<ProductPage>;
  abstract findById(id: string): Promise<ProductEntity | null>;
  abstract save(product: ProductEntity): Promise<ProductEntity>;
}
