import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IUserRepository } from 'src/infra/users/abstract/user.repository';
import { AuditLogService } from 'src/infra/data/audit-log.service';

@Injectable()
export class DeleteUserUseCase {
  constructor(
    @Inject(IUserRepository)
    private readonly users: IUserRepository,
    private readonly audit: AuditLogService,
  ) {}

  async execute(id: string, actorId: string): Promise<void> {
    const deleted = await this.users.delete(id);

    if (!deleted) {
      throw new NotFoundException('Usuário não encontrado');
    }
    await this.audit.record(actorId, 'user.deleted', 'user', id);
  }
}
