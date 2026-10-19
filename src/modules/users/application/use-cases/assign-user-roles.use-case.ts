import { Inject, Injectable } from '@nestjs/common';
import { AuditLogService } from 'src/infra/data/audit-log.service';
import { IUserRepository } from 'src/infra/users/abstract/user.repository';

@Injectable()
export class AssignUserRolesUseCase {
  constructor(
    @Inject(IUserRepository) private readonly users: IUserRepository,
    private readonly audit: AuditLogService,
  ) {}

  async execute(userId: string, roleIds: string[], actorId: string) {
    await this.users.assignRoles(userId, roleIds);
    await this.audit.record(actorId, 'user.roles.updated', 'user', userId, {
      roleIds,
    });
  }
}
