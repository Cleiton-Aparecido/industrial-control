import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from 'src/infra/auth/auth.service';
import { AuditLogService } from 'src/infra/data/audit-log.service';
import { IUserRepository } from 'src/infra/data/abstract/user.repository';
import { ChangePasswordDto } from '../dto/change-password.dto';

@Injectable()
export class ChangePasswordUseCase {
  constructor(
    @Inject(IUserRepository) private readonly users: IUserRepository,
    private readonly auth: AuthService,
    private readonly audit: AuditLogService,
  ) {}

  async execute(userId: string, input: ChangePasswordDto) {
    if (input.newPassword !== input.confirmNewPassword) {
      throw new BadRequestException('A confirmação de senha não corresponde');
    }
    if (input.currentPassword === input.newPassword) {
      throw new BadRequestException('A nova senha deve ser diferente da atual');
    }

    const user = await this.users.findById(userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Sessão inválida');
    }
    const verification = await this.auth.verifyPassword(
      input.currentPassword,
      user.password,
    );
    if (!verification.valid) {
      throw new BadRequestException('Senha atual inválida');
    }

    const updated = await this.users.updatePassword(
      userId,
      await this.auth.hashPassword(input.newPassword),
    );
    if (!updated) throw new UnauthorizedException('Sessão inválida');

    const updatedUser = await this.users.findById(userId);
    if (!updatedUser) throw new UnauthorizedException('Sessão inválida');
    await this.audit.record(userId, 'user.password.changed', 'user', userId);
    return {
      accessToken: await this.auth.signAccessToken(
        userId,
        updatedUser.tokenVersion,
      ),
      tokenType: 'Bearer',
      expiresIn: this.auth.getAccessTokenTtl(),
    };
  }
}
