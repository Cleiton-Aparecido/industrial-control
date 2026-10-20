import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProductImageProcessor } from 'src/modules/products/application/services/product-image-processor';

const config = (values: Record<string, string>) =>
  ({ get: (key: string) => values[key] }) as unknown as ConfigService;

const png = Buffer.from([
  137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0,
  0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66,
  96, 130,
]);

describe('ProductImageProcessor', () => {
  it('decodes a valid PNG data URL and accepts multiple images', () => {
    const processor = new ProductImageProcessor(config({}));
    const base64 = png.toString('base64');

    const images = processor.prepare([
      { base64: `data:image/png;base64,${base64}` },
      { base64 },
    ]);

    expect(images).toHaveLength(2);
    expect(images[0]).toEqual({
      buffer: png,
      contentType: 'image/png',
      extension: 'png',
    });
  });

  it('accepts valid unpadded Base64 input', () => {
    const processor = new ProductImageProcessor(config({}));
    const base64 = Buffer.from([0xff, 0xd8, 0xff, 0xd9])
      .toString('base64')
      .replace(/=+$/, '');

    expect(processor.prepare([{ base64 }])[0].contentType).toBe('image/jpeg');
  });

  it.each(['not-base64', '', 'AQ=='])(
    'rejects invalid image payload %j',
    (base64) => {
      const processor = new ProductImageProcessor(config({}));
      expect(() => processor.prepare([{ base64 }])).toThrow(
        BadRequestException,
      );
    },
  );

  it('rejects a Data URL whose declared MIME differs from its contents', () => {
    const processor = new ProductImageProcessor(config({}));
    const base64 = png.toString('base64');

    expect(() =>
      processor.prepare([{ base64: `data:image/jpeg;base64,${base64}` }]),
    ).toThrow(BadRequestException);
  });

  it('rejects unsupported formats and files over the configured size', () => {
    const processor = new ProductImageProcessor(
      config({ PRODUCT_IMAGE_MAX_SIZE_BYTES: '32' }),
    );

    expect(() =>
      processor.prepare([{ base64: Buffer.from('hello').toString('base64') }]),
    ).toThrow(BadRequestException);
    expect(() =>
      processor.prepare([{ base64: png.toString('base64') }]),
    ).toThrow(BadRequestException);
  });

  it('enforces the configured image count', () => {
    const processor = new ProductImageProcessor(
      config({ PRODUCT_IMAGE_MAX_COUNT: '1' }),
    );
    const base64 = png.toString('base64');

    expect(() => processor.prepare([{ base64 }, { base64 }])).toThrow(
      BadRequestException,
    );
  });
});
