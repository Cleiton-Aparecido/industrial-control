import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { IProductRepository } from '../abstract/product.repository';
import { AuditLogService } from 'src/infra/data/audit-log.service';
import { isUniqueConstraintViolation } from 'src/infra/data/is-unique-constraint-violation';
import {
  CreateProductDto,
  UpdateProductDto,
} from 'src/modules/products/application/dto/product.dto';

@Injectable()
export class ProductService {
  constructor(
    @Inject(IProductRepository)
    private readonly products: IProductRepository,
    private readonly audit: AuditLogService,
  ) {}

  async create(input: CreateProductDto, actorId: string) {
    try {
      return await this.products.create(
        {
          name: input.name,
          description: input.description ?? null,
          sku: input.sku?.trim().toUpperCase() || null,
          unit: input.unit,
          isActive: true,
        },
        actorId,
      );
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new ConflictException('SKU já cadastrado');
      }
      throw error;
    }
  }

  async list(page = 1, limit = 25, search?: string) {
    const { items, total } = await this.products.findPage(page, limit, search);
    return { items, total, page, limit };
  }

  async get(id: string) {
    const product = await this.products.findById(id);
    if (!product) throw new NotFoundException('Produto não encontrado');
    return product;
  }

  async update(id: string, input: UpdateProductDto, actorId: string) {
    const product = await this.products.findById(id);
    if (!product) throw new NotFoundException('Produto não encontrado');
    Object.assign(product, input);
    if (input.sku !== undefined) {
      product.sku = input.sku.trim().toUpperCase() || null;
    }
    try {
      await this.products.save(product);
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new ConflictException('SKU já cadastrado');
      }
      throw error;
    }
    await this.audit.record(actorId, 'product.updated', 'product', id, {
      changedFields: Object.keys(input),
    });
    return product;
  }

  async setActive(id: string, isActive: boolean, actorId: string) {
    const product = await this.get(id);
    product.isActive = isActive;
    await this.products.save(product);
    await this.audit.record(
      actorId,
      isActive ? 'product.activated' : 'product.deactivated',
      'product',
      id,
    );
    return product;
  }
}
