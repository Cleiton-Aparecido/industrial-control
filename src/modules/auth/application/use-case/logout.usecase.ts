import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { IUserRepository } from 'src/infra/data/abstract/user.repository';

@Injectable()
export class LogoutUseCase {
  constructor(
    @Inject(IUserRepository) private readonly users: IUserRepository,
  ) {}

  async execute(userId: string): Promise<void> {
    const invalidated = await this.users.invalidateSessions(userId);
    if (!invalidated) throw new UnauthorizedException('Sessão inválida');
  }
}
