import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import {
  IFileStorage,
  ImageContentType,
  ImageExtension,
  StoredFile,
} from '../abstract/file-storage';

@Injectable()
export class SupabaseStorageService extends IFileStorage {
  private readonly client: ReturnType<typeof createClient>;
  private readonly bucket: string;
  private readonly isPublic: boolean;

  constructor(config: ConfigService) {
    super();
    const url = config.getOrThrow<string>('SUPABASE_URL').trim();
    const secretKey = config.getOrThrow<string>('SUPABASE_SECRET_KEY').trim();
    if (!url || !secretKey) {
      throw new Error('SUPABASE_URL and SUPABASE_SECRET_KEY are required.');
    }
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      throw new Error('SUPABASE_URL must be a valid HTTP(S) URL.');
    }
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('SUPABASE_URL must be a valid HTTP(S) URL.');
    }
    this.client = createClient(url, secretKey);
    this.bucket =
      config.get<string>('SUPABASE_STORAGE_BUCKET')?.trim() || 'product-images';
    const publicSetting =
      config.get<string>('SUPABASE_STORAGE_PUBLIC') ?? 'true';
    if (!['true', 'false'].includes(publicSetting.toLowerCase())) {
      throw new Error('SUPABASE_STORAGE_PUBLIC must be true or false.');
    }
    this.isPublic = publicSetting.toLowerCase() === 'true';
  }

  async uploadProductImage(
    buffer: Buffer,
    contentType: ImageContentType,
    extension: ImageExtension,
  ): Promise<StoredFile> {
    const path = `products/${randomUUID()}.${extension}`;
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .upload(path, buffer, {
        contentType,
        cacheControl: '3600',
        upsert: false,
      });

    if (error || !data?.path) {
      throw new InternalServerErrorException(
        'Não foi possível armazenar a imagem do produto.',
      );
    }

    return { path: data.path };
  }

  async delete(path: string): Promise<void> {
    const { error } = await this.client.storage
      .from(this.bucket)
      .remove([path]);
    if (error) {
      throw new InternalServerErrorException(
        'Não foi possível remover a imagem do produto.',
      );
    }
  }

  getPublicUrl(path: string): string {
    const { data } = this.client.storage.from(this.bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  async getUrls(paths: string[]): Promise<string[]> {
    if (!paths.length) return [];
    if (this.isPublic) return paths.map((path) => this.getPublicUrl(path));

    const { data, error } = await this.client.storage
      .from(this.bucket)
      .createSignedUrls(paths, 3600);
    if (error || !data || data.length !== paths.length) {
      throw new InternalServerErrorException(
        'Não foi possível preparar o acesso às imagens do produto.',
      );
    }

    const signedUrls: string[] = [];
    for (const item of data) {
      if (!item.signedUrl) {
        throw new InternalServerErrorException(
          'Não foi possível preparar o acesso às imagens do produto.',
        );
      }
      signedUrls.push(item.signedUrl);
    }
    return signedUrls;
  }
}
