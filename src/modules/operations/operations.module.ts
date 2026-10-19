import { Module } from '@nestjs/common';
import { DataModule } from 'src/infra/data/data.module';
import { OperationsUseCaseSupport } from './application/services/operations-use-case-support';

@Module({
  imports: [DataModule],
  providers: [OperationsUseCaseSupport],
  exports: [OperationsUseCaseSupport],
})
export class OperationsModule {}
