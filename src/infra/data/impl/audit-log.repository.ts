import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  IAuditLogRepository,
  CreateAuditLogData,
} from '../abstract/audit-log.repository';
import { AuditLogEntity } from '../entities/audit-log.entity';

@Injectable()
export class AuditLogRepository extends IAuditLogRepository {
  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly repository: Repository<AuditLogEntity>,
  ) {
    super();
  }

  create(data: CreateAuditLogData): Promise<AuditLogEntity> {
    return this.repository.save(this.repository.create(data));
  }
}
