import { PermissionEntity } from '../entities/permission.entity';
import { RoleEntity } from '../entities/role.entity';

export type AccessPage<T> = { items: T[]; total: number };
export type RolePermissionResult =
  | { status: 'updated' | 'unchanged'; role: RoleEntity }
  | { status: 'role-not-found' }
  | { status: 'permission-not-found' };

export abstract class IAccessRepository {
  abstract listRoles(
    page: number,
    limit: number,
  ): Promise<AccessPage<RoleEntity>>;
  abstract findRoleWithPermissionsAndUsers(
    id: string,
  ): Promise<RoleEntity | null>;
  abstract findRoleWithUsers(id: string): Promise<RoleEntity | null>;
  abstract findRoleById(id: string): Promise<RoleEntity | null>;
  abstract roleSlugExists(slug: string): Promise<boolean>;
  abstract createRole(data: Partial<RoleEntity>): Promise<RoleEntity>;
  abstract saveRole(role: RoleEntity): Promise<RoleEntity>;
  abstract removeRole(role: RoleEntity): Promise<void>;
  abstract addPermissionToRole(
    roleId: string,
    permissionId: string,
    actorId: string,
  ): Promise<RolePermissionResult>;
  abstract removePermissionFromRole(
    roleId: string,
    permissionId: string,
    actorId: string,
  ): Promise<RolePermissionResult>;
  abstract listPermissions(
    page: number,
    limit: number,
    search?: string,
  ): Promise<AccessPage<PermissionEntity>>;
  abstract findPermissionWithRoles(
    id: string,
  ): Promise<PermissionEntity | null>;
  abstract findPermissionBySlugWithRoles(
    slug: string,
  ): Promise<PermissionEntity | null>;
  abstract findPermissionById(id: string): Promise<PermissionEntity | null>;
  abstract permissionSlugExists(slug: string): Promise<boolean>;
  abstract createPermission(
    data: Partial<PermissionEntity>,
  ): Promise<PermissionEntity>;
  abstract savePermission(
    permission: PermissionEntity,
  ): Promise<PermissionEntity>;
  abstract removePermission(permission: PermissionEntity): Promise<void>;
}
