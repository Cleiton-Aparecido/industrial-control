import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuditLogService } from 'src/infra/data/audit-log.service';
import { IUserRepository } from 'src/infra/data/abstract/user.repository';

@Injectable()
export class SetUserStatusUseCase {
  constructor(
    @Inject(IUserRepository) private readonly users: IUserRepository,
    private readonly audit: AuditLogService,
  ) {}

  async execute(id: string, isActive: boolean, actorId: string) {
    const updated = await this.users.setActive(id, isActive);
    if (!updated) throw new NotFoundException('Usuário não encontrado');
    await this.audit.record(
      actorId,
      isActive ? 'user.activated' : 'user.deactivated',
      'user',
      id,
    );
  }
}
