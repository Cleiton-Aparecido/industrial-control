import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, ILike } from 'typeorm';
import {
  CreateProductData,
  CreateProductImageData,
  IProductRepository,
  ProductPage,
} from '../abstract/product.repository';
import { ProductEntity } from '../entities/product.entity';
import { ProductImageEntity } from '../entities/product-image.entity';
import { StockBalanceEntity } from 'src/infra/stock/entities/stock-balance.entity';

@Injectable()
export class ProductRepository extends IProductRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {
    super();
  }

  create(
    data: CreateProductData,
    actorId: string,
    images: CreateProductImageData[] = [],
  ): Promise<ProductEntity> {
    return this.dataSource.transaction(async (manager) => {
      const products = manager.getRepository(ProductEntity);
      const product = await products.save(products.create(data));
      if (images.length) {
        product.images = await manager
          .getRepository(ProductImageEntity)
          .save(images.map((image) => ({ ...image, productId: product.id })));
      } else {
        product.images = [];
      }
      await manager.getRepository(StockBalanceEntity).save({
        productId: product.id,
      });
      await manager.query(
        `INSERT INTO "audit_logs" ("actor_user_id", "action", "resource_type", "resource_id", "metadata") VALUES ($1, $2, $3, $4, $5::jsonb)`,
        [
          actorId,
          'product.created',
          'product',
          product.id,
          JSON.stringify({ price: product.price }),
        ],
      );
      return product;
    });
  }

  async findPage(
    page: number,
    limit: number,
    search?: string,
  ): Promise<ProductPage> {
    const [items, total] = await this.dataSource
      .getRepository(ProductEntity)
      .findAndCount({
        where: search?.trim()
          ? [
              { name: ILike(`%${search.trim()}%`) },
              { sku: ILike(`%${search.trim()}%`) },
            ]
          : undefined,
        order: { name: 'ASC', images: { createdAt: 'ASC' } },
        relations: { images: true },
        skip: (page - 1) * limit,
        take: limit,
      });
    return { items, total };
  }

  async findActivePage(
    page: number,
    limit: number,
    search?: string,
  ): Promise<ProductPage> {
    const term = search?.trim();
    const [items, total] = await this.dataSource
      .getRepository(ProductEntity)
      .findAndCount({
        where: term
          ? [
              { isActive: true, name: ILike(`%${term}%`) },
              { isActive: true, sku: ILike(`%${term}%`) },
            ]
          : { isActive: true },
        order: { name: 'ASC', images: { createdAt: 'ASC' } },
        relations: { images: true },
        skip: (page - 1) * limit,
        take: limit,
      });
    return { items, total };
  }

  findById(id: string): Promise<ProductEntity | null> {
    return this.dataSource.getRepository(ProductEntity).findOne({
      where: { id },
      relations: { images: true },
      order: { images: { createdAt: 'ASC' } },
    });
  }

  save(product: ProductEntity): Promise<ProductEntity> {
    return this.dataSource.getRepository(ProductEntity).save(product);
  }
}
