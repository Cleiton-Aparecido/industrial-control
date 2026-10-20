import { ProductService } from 'src/infra/products/services/product.service';
import { IFileStorage } from 'src/infra/storage/abstract/file-storage';
import { ProductImageProcessor } from 'src/modules/products/application/services/product-image-processor';
import { ProductImageResponseService } from 'src/modules/products/application/services/product-image-response.service';
import { CreateProductUseCase } from 'src/modules/products/application/use-cases/create-product.use-case';

const png = Buffer.from([
  137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0,
  0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66,
  96, 130,
]);

describe('CreateProductUseCase image orchestration', () => {
  let products: jest.Mocked<Pick<ProductService, 'create'>>;
  let storage: jest.Mocked<Pick<IFileStorage, 'uploadProductImage' | 'delete'>>;
  let imageResponses: jest.Mocked<Pick<ProductImageResponseService, 'present'>>;
  let useCase: CreateProductUseCase;

  beforeEach(() => {
    products = { create: jest.fn().mockResolvedValue({ id: 'product-id' }) };
    storage = {
      uploadProductImage: jest
        .fn()
        .mockResolvedValue({ path: 'products/image.png' }),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    imageResponses = {
      present: jest.fn().mockReturnValue({ id: 'product-id', images: [] }),
    };
    useCase = new CreateProductUseCase(
      products as unknown as ProductService,
      new ProductImageProcessor({ get: () => undefined } as never),
      imageResponses as unknown as ProductImageResponseService,
      storage as unknown as IFileStorage,
    );
  });

  it('uploads multiple images and never passes Base64 into product persistence', async () => {
    const base64 = png.toString('base64');
    storage.uploadProductImage
      .mockResolvedValueOnce({ path: 'products/first.png' })
      .mockResolvedValueOnce({ path: 'products/second.png' });
    const input = {
      name: 'Produto',
      unit: 'un',
      price: '10.00',
      images: [{ base64: `data:image/png;base64,${base64}` }, { base64 }],
    };

    await useCase.execute(input, 'actor-id');

    expect(storage.uploadProductImage).toHaveBeenCalledTimes(2);
    expect(products.create).toHaveBeenCalledWith(
      { name: 'Produto', unit: 'un', price: '10.00' },
      'actor-id',
      [
        { path: 'products/first.png', contentType: 'image/png' },
        { path: 'products/second.png', contentType: 'image/png' },
      ],
    );
  });

  it('removes only files uploaded by the operation when database persistence fails', async () => {
    const originalError = new Error('database unavailable');
    products.create.mockRejectedValue(originalError);
    const base64 = png.toString('base64');

    await expect(
      useCase.execute(
        {
          name: 'Produto',
          unit: 'un',
          price: '10.00',
          images: [{ base64 }],
        },
        'actor-id',
      ),
    ).rejects.toBe(originalError);

    expect(storage.delete).toHaveBeenCalledTimes(1);
    expect(storage.delete).toHaveBeenCalledWith('products/image.png');
  });

  it('cleans up earlier uploads if a later image upload fails', async () => {
    storage.uploadProductImage
      .mockResolvedValueOnce({ path: 'products/first.png' })
      .mockRejectedValueOnce(new Error('storage unavailable'));
    const base64 = png.toString('base64');

    await expect(
      useCase.execute(
        {
          name: 'Produto',
          unit: 'un',
          price: '10.00',
          images: [{ base64 }, { base64 }],
        },
        'actor-id',
      ),
    ).rejects.toThrow('storage unavailable');

    expect(products.create).not.toHaveBeenCalled();
    expect(storage.delete).toHaveBeenCalledWith('products/first.png');
  });

  it('keeps the original error if storage compensation also fails', async () => {
    const originalError = new Error('database unavailable');
    products.create.mockRejectedValue(originalError);
    storage.delete.mockRejectedValue(new Error('storage unavailable'));
    const base64 = png.toString('base64');

    await expect(
      useCase.execute(
        {
          name: 'Produto',
          unit: 'un',
          price: '10.00',
          images: [{ base64 }],
        },
        'actor-id',
      ),
    ).rejects.toBe(originalError);
  });
});
