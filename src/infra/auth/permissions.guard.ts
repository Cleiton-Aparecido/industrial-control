import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AuthenticatedUser } from './auth.service';
import {
  IS_PUBLIC_KEY,
  PERMISSION_FREE_KEY,
  REQUIRED_PERMISSIONS_KEY,
} from './auth-metadata';

interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) {
      return true;
    }
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.user) {
      throw new UnauthorizedException('Autenticação obrigatória');
    }
    if (
      this.reflector.getAllAndOverride<boolean>(PERMISSION_FREE_KEY, targets)
    ) {
      return true;
    }

    const required = this.reflector.getAllAndOverride<string[]>(
      REQUIRED_PERMISSIONS_KEY,
      targets,
    );
    if (!required?.length) {
      throw new ForbiddenException('Rota sem política de permissões');
    }

    const granted = new Set(request.user.permissions);
    if (!required.every((permission) => granted.has(permission))) {
      throw new ForbiddenException('Permissão insuficiente');
    }
    return true;
  }
}
