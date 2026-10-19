import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataModule } from './data.module';
import { AuditLogEntity } from './entities/audit-log.entity';
import { IAuditLogRepository } from './abstract/audit-log.repository';
import { AuditLogRepository } from './impl/audit-log.repository';
import { AuditLogService } from './audit-log.service';

@Module({
  imports: [DataModule, TypeOrmModule.forFeature([AuditLogEntity])],
  providers: [
    AuditLogService,
    { provide: IAuditLogRepository, useClass: AuditLogRepository },
  ],
  exports: [AuditLogService],
})
export class AuditLogInfrastructureModule {}
