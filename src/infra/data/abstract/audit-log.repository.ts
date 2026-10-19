import { AuditLogEntity } from '../entities/audit-log.entity';

export type CreateAuditLogData = Pick<
  AuditLogEntity,
  'actorUserId' | 'action' | 'resourceType' | 'resourceId' | 'metadata'
>;

export abstract class IAuditLogRepository {
  abstract create(data: CreateAuditLogData): Promise<AuditLogEntity>;
}
