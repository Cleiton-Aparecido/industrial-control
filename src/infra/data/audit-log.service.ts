import { Inject, Injectable } from '@nestjs/common';
import { IAuditLogRepository } from './abstract/audit-log.repository';
import { AuditLogEntity } from './entities/audit-log.entity';

@Injectable()
export class AuditLogService {
  constructor(
    @Inject(IAuditLogRepository)
    private readonly repository: IAuditLogRepository,
  ) {}

  record(
    actorUserId: string | null,
    action: string,
    resourceType: string,
    resourceId: string | null,
    metadata?: Record<string, unknown>,
  ): Promise<AuditLogEntity> {
    return this.repository.create({
      actorUserId,
      action,
      resourceType,
      resourceId,
      metadata: metadata ?? null,
    });
  }
}
