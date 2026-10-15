import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  IS_PUBLIC_KEY,
  PERMISSION_FREE_KEY,
  REQUIRED_PERMISSIONS_KEY,
} from './auth-metadata';
import { PermissionsGuard } from './permissions.guard';

describe('PermissionsGuard', () => {
  const handler = {};
  const controller = {};
  let metadata: Map<string, unknown>;
  let guard: PermissionsGuard;
  let request: { user?: { permissions: string[] } };

  const context = () =>
    ({
      getHandler: () => handler,
      getClass: () => controller,
      switchToHttp: () => ({ getRequest: () => request }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    metadata = new Map();
    request = { user: { permissions: [] } };
    const reflector = {
      getAllAndOverride: (key: string) => metadata.get(key),
    } as unknown as Reflector;
    guard = new PermissionsGuard(reflector);
  });

  it('requires every declared permission', () => {
    metadata.set(REQUIRED_PERMISSIONS_KEY, ['users.read', 'users.update']);
    request.user!.permissions = ['users.read'];

    expect(() => guard.canActivate(context())).toThrow(ForbiddenException);
    request.user!.permissions.push('users.update');
    expect(guard.canActivate(context())).toBe(true);
  });

  it('rejects protected routes without an explicit permission policy', () => {
    expect(() => guard.canActivate(context())).toThrow(ForbiddenException);
  });

  it('returns 401 when authentication has not populated the request', () => {
    metadata.set(REQUIRED_PERMISSIONS_KEY, ['users.read']);
    request.user = undefined;

    expect(() => guard.canActivate(context())).toThrow(UnauthorizedException);
  });

  it('returns 401 when authentication has not populated the request', () => {
    metadata.set(REQUIRED_PERMISSIONS_KEY, ['users.read']);
    request.user = undefined;

    expect(() => guard.canActivate(context())).toThrow(UnauthorizedException);
  });

  it('allows only explicitly public or permission-free routes to skip metadata', () => {
    metadata.set(IS_PUBLIC_KEY, true);
    expect(guard.canActivate(context())).toBe(true);
    metadata.clear();
    metadata.set(PERMISSION_FREE_KEY, true);
    expect(guard.canActivate(context())).toBe(true);
  });
});
