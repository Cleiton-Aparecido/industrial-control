import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { IFileStorage } from '../abstract/file-storage';
import { SupabaseStorageService } from './supabase-storage.service';

@Module({
  imports: [ConfigModule],
  providers: [
    SupabaseStorageService,
    { provide: IFileStorage, useExisting: SupabaseStorageService },
  ],
  exports: [IFileStorage],
})
export class SupabaseStorageModule {}
