import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UpdateUserInputDto } from '../dto/update-user-input.dto';
import { IUserRepository } from 'src/infra/users/abstract/user.repository';
import { AuditLogService } from 'src/infra/data/audit-log.service';
import { isUniqueConstraintViolation } from 'src/infra/data/is-unique-constraint-violation';

@Injectable()
export class UpdateUserUseCase {
  constructor(
    @Inject(IUserRepository)
    private readonly users: IUserRepository,
    private readonly audit: AuditLogService,
  ) {}

  async execute(id: string, input: UpdateUserInputDto, actorId: string) {
    const current = await this.users.findById(id);

    if (!current) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const data: UpdateUserInputDto = {
      ...input,
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
    };

    if (input.email !== undefined) {
      data.email = input.email.trim().toLowerCase();

      const existing = await this.users.findByEmail(data.email);

      if (existing && existing.id !== id) {
        throw new ConflictException('E-mail já cadastrado');
      }
    }

    let updated;
    try {
      updated = await this.users.update(id, data);
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new ConflictException('E-mail já cadastrado');
      }
      throw error;
    }
    if (!updated) throw new NotFoundException('Usuário não encontrado');
    await this.audit.record(actorId, 'user.updated', 'user', id, {
      changedFields: Object.keys(input),
    });
    return updated;
  }
}
