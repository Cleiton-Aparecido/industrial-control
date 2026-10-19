import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataConfigOptions } from './data.config';

@Module({
  imports: [ConfigModule, TypeOrmModule.forRoot(DataConfigOptions)],
})
export class DataModule {}
