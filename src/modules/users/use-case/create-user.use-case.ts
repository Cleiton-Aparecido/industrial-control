import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { CreateUserInputDto } from '../dto/create-user-input.dto';
import { IUserRepository } from 'src/infra/data/abstract/user.repository';
import { AuthService } from 'src/infra/auth/auth.service';
import { AuditLogService } from 'src/infra/data/audit-log.service';
import { isUniqueConstraintViolation } from 'src/infra/data/is-unique-constraint-violation';

@Injectable()
export class CreateUserUseCase {
  constructor(
    @Inject(IUserRepository)
    private readonly users: IUserRepository,
    private readonly auth: AuthService,
    private readonly audit: AuditLogService,
  ) {}

  async execute(input: CreateUserInputDto, actorId: string) {
    const email = input.email.trim().toLowerCase();

    const existing = await this.users.findByEmail(email);

    if (existing) {
      throw new ConflictException('E-mail já cadastrado');
    }

    let user;
    try {
      user = await this.users.create({
        name: input.name.trim(),
        email,
        password: await this.auth.hashPassword(input.password),
        isActive: true,
        mustChangePassword: true,
      });
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new ConflictException('E-mail já cadastrado');
      }
      throw error;
    }
    await this.audit.record(actorId, 'user.created', 'user', user.id);
    return user;
  }
}
