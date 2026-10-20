import { IFileStorage } from 'src/infra/storage/abstract/file-storage';
import { ProductEntity } from 'src/infra/products/entities/product.entity';
import { ProductImageResponseService } from 'src/modules/products/application/services/product-image-response.service';

describe('ProductImageResponseService', () => {
  it('uses one URL batch and returns ready-to-render image URLs', async () => {
    const storage = {
      getUrls: jest
        .fn()
        .mockResolvedValue([
          'https://cdn.test/one.png',
          'https://cdn.test/two.jpg',
        ]),
    };
    const presenter = new ProductImageResponseService(
      storage as unknown as IFileStorage,
    );
    const products = [
      {
        id: 'product-id',
        name: 'Produto',
        images: [
          { id: 'image-1', path: 'products/one.png', contentType: 'image/png' },
          {
            id: 'image-2',
            path: 'products/two.jpg',
            contentType: 'image/jpeg',
          },
        ],
      },
    ] as ProductEntity[];

    const result = await presenter.presentMany(products);

    expect(storage.getUrls).toHaveBeenCalledTimes(1);
    expect(storage.getUrls).toHaveBeenCalledWith([
      'products/one.png',
      'products/two.jpg',
    ]);
    expect(result[0].images).toEqual([
      {
        id: 'image-1',
        url: 'https://cdn.test/one.png',
        contentType: 'image/png',
      },
      {
        id: 'image-2',
        url: 'https://cdn.test/two.jpg',
        contentType: 'image/jpeg',
      },
    ]);
  });
});
