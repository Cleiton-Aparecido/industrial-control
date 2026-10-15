import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLogEntity } from './entities/audit-log.entity';

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly repository: Repository<AuditLogEntity>,
  ) {}

  record(
    actorUserId: string | null,
    action: string,
    resourceType: string,
    resourceId: string | null,
    metadata?: Record<string, unknown>,
  ): Promise<AuditLogEntity> {
    return this.repository.save(
      this.repository.create({
        actorUserId,
        action,
        resourceType,
        resourceId,
        metadata: metadata ?? null,
      }),
    );
  }
}
