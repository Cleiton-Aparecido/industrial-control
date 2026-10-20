export type ImageContentType = 'image/jpeg' | 'image/png' | 'image/webp';
export type ImageExtension = 'jpg' | 'png' | 'webp';

export type StoredFile = { path: string };

export abstract class IFileStorage {
  abstract uploadProductImage(
    buffer: Buffer,
    contentType: ImageContentType,
    extension: ImageExtension,
  ): Promise<StoredFile>;

  abstract delete(path: string): Promise<void>;
  abstract getPublicUrl(path: string): string;
  abstract getUrls(paths: string[]): Promise<string[]>;
}
