import { ProductService } from 'src/infra/products/services/product.service';
import { ProductImageResponseService } from 'src/modules/products/application/services/product-image-response.service';
import { ListPublicProductsUseCase } from 'src/modules/products/application/use-cases/list-public-products.use-case';

describe('ListPublicProductsUseCase', () => {
  it('lists a page of active products and maps their image URLs', async () => {
    const products = {
      listActive: jest.fn().mockResolvedValue({
        items: [{ id: 'active-product' }],
        total: 31,
        page: 2,
        limit: 10,
      }),
    };
    const imageResponses = {
      presentMany: jest
        .fn()
        .mockResolvedValue([{ id: 'active-product', images: [] }]),
    };
    const useCase = new ListPublicProductsUseCase(
      products as unknown as ProductService,
      imageResponses as unknown as ProductImageResponseService,
    );

    await expect(useCase.execute(2, 10)).resolves.toEqual({
      items: [{ id: 'active-product', images: [] }],
      total: 31,
      page: 2,
      limit: 10,
    });
    expect(products.listActive).toHaveBeenCalledWith(2, 10);
    expect(imageResponses.presentMany).toHaveBeenCalledWith([
      { id: 'active-product' },
    ]);
  });
});
