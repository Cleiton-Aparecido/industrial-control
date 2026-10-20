import { InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import { SupabaseStorageService } from 'src/infra/storage/supabase/supabase-storage.service';

jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn() }));

describe('SupabaseStorageService', () => {
  const mockCreateClient = jest.mocked(createClient);
  const upload = jest.fn();
  const remove = jest.fn();
  const getPublicUrl = jest.fn();
  const createSignedUrls = jest.fn();
  const from = jest.fn(() => ({
    upload,
    remove,
    getPublicUrl,
    createSignedUrls,
  }));
  const client = { storage: { from } };
  const config = {
    getOrThrow: (key: string) =>
      ({
        SUPABASE_URL: 'https://project.supabase.co',
        SUPABASE_SECRET_KEY: 'secret',
      })[key as 'SUPABASE_URL' | 'SUPABASE_SECRET_KEY'],
    get: () => undefined,
  } as unknown as ConfigService;

  let service: SupabaseStorageService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateClient.mockReturnValue(client as never);
    upload.mockResolvedValue({
      data: { path: 'products/generated.png' },
      error: null,
    });
    remove.mockResolvedValue({ data: [], error: null });
    createSignedUrls.mockResolvedValue({
      data: [{ signedUrl: 'https://cdn.test/signed.png' }],
      error: null,
    });
    getPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://cdn.test/image.png' },
    });
    service = new SupabaseStorageService(config);
  });

  it('uploads using the configured default bucket and the validated MIME', async () => {
    const result = await service.uploadProductImage(
      Buffer.from('image'),
      'image/png',
      'png',
    );

    expect(from).toHaveBeenCalledWith('product-images');
    expect(upload).toHaveBeenCalledWith(
      expect.stringMatching(/^products\/[0-9a-f-]+\.png$/),
      expect.any(Buffer),
      expect.objectContaining({ contentType: 'image/png', upsert: false }),
    );
    expect(result.path).toBe('products/generated.png');
  });

  it('does not report success when Supabase returns an upload error', async () => {
    upload.mockResolvedValue({
      data: null,
      error: new Error('remote failure'),
    });

    await expect(
      service.uploadProductImage(Buffer.from('image'), 'image/png', 'png'),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });

  it('checks removal errors and returns the public URL from the SDK', async () => {
    await service.delete('products/image.png');
    expect(service.getPublicUrl('products/image.png')).toBe(
      'https://cdn.test/image.png',
    );
    expect(remove).toHaveBeenCalledWith(['products/image.png']);

    remove.mockResolvedValue({
      data: null,
      error: new Error('remote failure'),
    });
    await expect(service.delete('products/image.png')).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });

  it('creates a batch of signed URLs for a private bucket', async () => {
    const privateConfig = {
      ...config,
      get: (key: string) =>
        key === 'SUPABASE_STORAGE_PUBLIC' ? 'false' : undefined,
    } as ConfigService;
    service = new SupabaseStorageService(privateConfig);

    await expect(service.getUrls(['products/image.png'])).resolves.toEqual([
      'https://cdn.test/signed.png',
    ]);
    expect(createSignedUrls).toHaveBeenCalledWith(['products/image.png'], 3600);
  });
});
