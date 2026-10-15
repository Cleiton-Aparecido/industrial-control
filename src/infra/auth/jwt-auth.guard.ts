import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IUserRepository } from 'src/infra/data/abstract/user.repository';
import { AuthService, AuthenticatedUser } from './auth.service';
import { ALLOW_PASSWORD_CHANGE, IS_PUBLIC_KEY } from './auth-metadata';

interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly reflector: Reflector,
    @Inject(IUserRepository) private readonly users: IUserRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    const match = authorization?.match(/^Bearer\s+(\S+)$/i);

    if (!match) {
      throw new UnauthorizedException('Token de acesso não informado');
    }

    try {
      const claims = await this.authService.verifyAccessToken(match[1]);
      const user = await this.users.findForAuthorization(claims.sub);

      if (!user || !user.isActive || user.tokenVersion !== claims.ver) {
        throw new UnauthorizedException('Sessão inválida');
      }

      const allowPasswordChange = this.reflector.getAllAndOverride<boolean>(
        ALLOW_PASSWORD_CHANGE,
        [context.getHandler(), context.getClass()],
      );
      if (
        user.mustChangePassword &&
        (!allowPasswordChange || claims.pwd !== true)
      ) {
        throw new ForbiddenException('Troca de senha obrigatória');
      }
      if (!user.mustChangePassword && claims.pwd === true) {
        throw new UnauthorizedException('Sessão inválida');
      }

      request.user = {
        sub: user.id,
        name: user.name,
        email: user.email,
        mustChangePassword: user.mustChangePassword,
        roleSlugs: user.roles?.map((role) => role.slug) ?? [],
        permissions:
          user.roles?.flatMap(
            (role) =>
              role.permissions?.map((permission) => permission.slug) ?? [],
          ) ?? [],
      };
      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;
      throw new UnauthorizedException('Token de acesso inválido ou expirado');
    }
  }
}
