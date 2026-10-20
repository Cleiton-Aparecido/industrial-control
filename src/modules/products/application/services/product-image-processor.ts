import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreateProductImageDto } from '../dto/product.dto';

export type ProductImageContentType = 'image/jpeg' | 'image/png' | 'image/webp';

export type ValidatedProductImage = {
  buffer: Buffer;
  contentType: ProductImageContentType;
  extension: 'jpg' | 'png' | 'webp';
};

const MAX_CONFIGURED_IMAGE_COUNT = 20;
const DEFAULT_MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const DEFAULT_MAX_IMAGE_COUNT = 5;
const DATA_URL_PATTERN =
  /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]*={0,2})$/i;
const BASE64_CHARACTERS_PATTERN = /^[A-Za-z0-9+/]*={0,2}$/;

const imageTypes: Record<
  ProductImageContentType,
  ValidatedProductImage['extension']
> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export function getProductImageRequestBodyLimit(config: ConfigService): number {
  const maxImageSizeBytes = readPositiveInteger(
    config.get<string>('PRODUCT_IMAGE_MAX_SIZE_BYTES'),
    DEFAULT_MAX_IMAGE_SIZE_BYTES,
    'PRODUCT_IMAGE_MAX_SIZE_BYTES',
  );
  const maxImageCount = readPositiveInteger(
    config.get<string>('PRODUCT_IMAGE_MAX_COUNT'),
    DEFAULT_MAX_IMAGE_COUNT,
    'PRODUCT_IMAGE_MAX_COUNT',
  );
  if (maxImageCount > MAX_CONFIGURED_IMAGE_COUNT) {
    throw new Error(
      `PRODUCT_IMAGE_MAX_COUNT must be at most ${MAX_CONFIGURED_IMAGE_COUNT}.`,
    );
  }

  const limit =
    Math.ceil(maxImageSizeBytes / 3) * 4 * maxImageCount +
    maxImageCount * 1024 +
    1024 * 1024;
  if (!Number.isSafeInteger(limit)) {
    throw new Error(
      'Configured product image request body limit is too large.',
    );
  }
  return limit;
}

@Injectable()
export class ProductImageProcessor {
  private readonly maxImageSizeBytes: number;
  private readonly maxImageCount: number;

  constructor(config: ConfigService) {
    this.maxImageSizeBytes = readPositiveInteger(
      config.get<string>('PRODUCT_IMAGE_MAX_SIZE_BYTES'),
      DEFAULT_MAX_IMAGE_SIZE_BYTES,
      'PRODUCT_IMAGE_MAX_SIZE_BYTES',
    );
    this.maxImageCount = readPositiveInteger(
      config.get<string>('PRODUCT_IMAGE_MAX_COUNT'),
      DEFAULT_MAX_IMAGE_COUNT,
      'PRODUCT_IMAGE_MAX_COUNT',
    );

    if (this.maxImageCount > MAX_CONFIGURED_IMAGE_COUNT) {
      throw new Error(
        `PRODUCT_IMAGE_MAX_COUNT must be at most ${MAX_CONFIGURED_IMAGE_COUNT}.`,
      );
    }
  }

  prepare(images?: CreateProductImageDto[]): ValidatedProductImage[] {
    if (!images?.length) return [];
    if (images.length > this.maxImageCount) {
      throw new BadRequestException(
        `O limite é de ${this.maxImageCount} imagens por produto.`,
      );
    }

    return images.map((image) => this.prepareImage(image.base64));
  }

  private prepareImage(value: string): ValidatedProductImage {
    if (typeof value !== 'string' || value.length === 0) {
      throw new BadRequestException('A imagem Base64 não pode estar vazia.');
    }

    const dataUrl = DATA_URL_PATTERN.exec(value);
    const declaredContentType = dataUrl?.[1].toLowerCase();
    const encoded = dataUrl ? dataUrl[2] : value;

    if (
      !encoded ||
      !BASE64_CHARACTERS_PATTERN.test(encoded) ||
      encoded.length % 4 === 1
    ) {
      throw new BadRequestException('A imagem Base64 é inválida.');
    }

    const unpadded = encoded.replace(/=+$/, '');
    const padding = encoded.length - unpadded.length;
    const expectedPadding = (4 - (unpadded.length % 4)) % 4;
    if (
      (padding > 0 &&
        (encoded.length % 4 !== 0 || padding !== expectedPadding)) ||
      expectedPadding > 2
    ) {
      throw new BadRequestException('A imagem Base64 é inválida.');
    }
    const normalized = unpadded + '='.repeat(expectedPadding);

    const maximumEncodedLength = Math.ceil(this.maxImageSizeBytes / 3) * 4;
    if (normalized.length > maximumEncodedLength) {
      throw new BadRequestException(
        'A imagem excede o tamanho máximo permitido.',
      );
    }

    const buffer = Buffer.from(normalized, 'base64');
    if (
      buffer.length === 0 ||
      buffer.length > this.maxImageSizeBytes ||
      buffer.toString('base64') !== normalized
    ) {
      throw new BadRequestException('A imagem Base64 é inválida.');
    }

    const contentType = this.detectContentType(buffer);
    if (
      !contentType ||
      (declaredContentType && declaredContentType !== contentType)
    ) {
      throw new BadRequestException(
        'O MIME informado não corresponde ao conteúdo da imagem.',
      );
    }

    return {
      buffer,
      contentType,
      extension: imageTypes[contentType],
    };
  }

  private detectContentType(buffer: Buffer): ProductImageContentType | null {
    const isJpeg =
      buffer.length >= 4 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff &&
      buffer[buffer.length - 2] === 0xff &&
      buffer[buffer.length - 1] === 0xd9;
    if (isJpeg) return 'image/jpeg';

    const isPng =
      buffer.length >= 33 &&
      buffer
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) &&
      buffer.readUInt32BE(8) === 13 &&
      buffer.toString('ascii', 12, 16) === 'IHDR' &&
      buffer.toString('ascii', buffer.length - 8, buffer.length - 4) === 'IEND';
    if (isPng) return 'image/png';

    const webpChunk = buffer.toString('ascii', 12, 16);
    const isWebp =
      buffer.length >= 20 &&
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP' &&
      buffer.readUInt32LE(4) + 8 <= buffer.length &&
      ['VP8 ', 'VP8L', 'VP8X'].includes(webpChunk);
    if (isWebp) return 'image/webp';

    return null;
  }
}

function readPositiveInteger(
  value: string | undefined,
  defaultValue: number,
  name: string,
): number {
  if (value === undefined || value === '') return defaultValue;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive safe integer.`);
  }
  return parsed;
}
