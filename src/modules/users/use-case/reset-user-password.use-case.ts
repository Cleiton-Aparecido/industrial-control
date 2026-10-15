import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuthService } from 'src/infra/auth/auth.service';
import { AuditLogService } from 'src/infra/data/audit-log.service';
import { IUserRepository } from 'src/infra/data/abstract/user.repository';

@Injectable()
export class ResetUserPasswordUseCase {
  constructor(
    @Inject(IUserRepository) private readonly users: IUserRepository,
    private readonly auth: AuthService,
    private readonly audit: AuditLogService,
  ) {}

  async execute(id: string, newPassword: string, actorId: string) {
    const passwordHash = await this.auth.hashPassword(newPassword);
    const updated = await this.users.resetPassword(id, passwordHash);
    if (!updated) throw new NotFoundException('Usuário não encontrado');
    await this.audit.record(actorId, 'user.password.reset', 'user', id);
    return { id, mustChangePassword: true };
  }
}
