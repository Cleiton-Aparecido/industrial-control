import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from 'src/infra/auth/service/auth.service';
import {
  ALLOW_PASSWORD_CHANGE,
  IS_PUBLIC_KEY,
} from 'src/infra/auth/auth-metadata';
import { JwtAuthGuard } from 'src/infra/auth/guard/jwt-auth.guard';

describe('JwtAuthGuard', () => {
  const handler = {};
  const controller = {};
  let metadata: Map<string, unknown>;
  let request: { headers: { authorization?: string }; user?: unknown };
  let auth: { verifyAccessToken: jest.Mock };
  let users: { findForAuthorization: jest.Mock };
  let guard: JwtAuthGuard;

  const context = () =>
    ({
      getHandler: () => handler,
      getClass: () => controller,
      switchToHttp: () => ({ getRequest: () => request }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    metadata = new Map();
    request = { headers: { authorization: 'Bearer valid-token' } };
    auth = {
      verifyAccessToken: jest
        .fn()
        .mockResolvedValue({ sub: 'user-id', ver: 2 }),
    };
    users = {
      findForAuthorization: jest.fn().mockResolvedValue({
        id: 'user-id',
        name: 'Operator',
        email: 'operator@example.com',
        isActive: true,
        tokenVersion: 2,
        mustChangePassword: false,
        roles: [{ slug: 'operator', permissions: [{ slug: 'users.read' }] }],
      }),
    };
    const reflector = {
      getAllAndOverride: (key: string) => metadata.get(key),
    } as unknown as Reflector;
    guard = new JwtAuthGuard(
      auth as unknown as AuthService,
      reflector,
      users as never,
    );
  });

  it('loads the current account and permissions from the repository', async () => {
    await expect(guard.canActivate(context())).resolves.toBe(true);
    expect(request.user).toEqual({
      sub: 'user-id',
      name: 'Operator',
      email: 'operator@example.com',
      mustChangePassword: false,
      roleSlugs: ['operator'],
      permissions: ['users.read'],
    });
  });

  it('rejects inactive accounts and stale token versions', async () => {
    users.findForAuthorization.mockResolvedValueOnce({
      id: 'user-id',
      isActive: false,
      tokenVersion: 2,
    });
    await expect(guard.canActivate(context())).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    users.findForAuthorization.mockResolvedValueOnce({
      id: 'user-id',
      isActive: true,
      tokenVersion: 3,
      mustChangePassword: false,
    });
    await expect(guard.canActivate(context())).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('blocks a password-change token everywhere except the declared flow', async () => {
    auth.verifyAccessToken.mockResolvedValue({
      sub: 'user-id',
      ver: 2,
      pwd: true,
    });
    users.findForAuthorization.mockResolvedValue({
      id: 'user-id',
      isActive: true,
      tokenVersion: 2,
      mustChangePassword: true,
      roles: [],
    });

    await expect(guard.canActivate(context())).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    metadata.set(ALLOW_PASSWORD_CHANGE, true);
    await expect(guard.canActivate(context())).resolves.toBe(true);
  });

  it('allows only explicitly public routes to bypass JWT', async () => {
    metadata.set(IS_PUBLIC_KEY, true);
    request.headers.authorization = undefined;

    await expect(guard.canActivate(context())).resolves.toBe(true);
    expect(users.findForAuthorization).not.toHaveBeenCalled();
  });
});
