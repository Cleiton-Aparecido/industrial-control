import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { IUserRepository } from 'src/infra/users/abstract/user.repository';
import { AuthService } from 'src/infra/auth/service/auth.service';
import { LoginDto } from '../dto/login.dto';

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(IUserRepository)
    private readonly users: IUserRepository,
    private readonly auth: AuthService,
  ) {}

  async execute(input: LoginDto) {
    const user = await this.users.findByEmail(input.email.trim().toLowerCase());
    const verification = user?.isActive
      ? await this.auth.verifyPassword(input.password, user.password)
      : { valid: false };

    if (!user || !user.isActive || !verification.valid) {
      throw new UnauthorizedException('E-mail ou senha inválidos');
    }

    if (verification.rehashedPassword) {
      await this.users.replacePasswordHash(
        user.id,
        verification.rehashedPassword,
      );
    }

    const accessToken = await this.auth.signAccessToken(
      user.id,
      user.tokenVersion,
      user.mustChangePassword,
    );

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: this.auth.getAccessTokenTtl(),
      mustChangePassword: user.mustChangePassword,
      user: { id: user.id, name: user.name, email: user.email },
    };
  }
}
