import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AccessPage,
  IAccessRepository,
  RolePermissionResult,
} from '../abstract/access.repository';
import { PermissionEntity } from '../entities/permission.entity';
import { RoleEntity } from '../entities/role.entity';

@Injectable()
export class AccessRepository extends IAccessRepository {
  constructor(
    @InjectRepository(RoleEntity)
    private readonly roles: Repository<RoleEntity>,
    @InjectRepository(PermissionEntity)
    private readonly permissions: Repository<PermissionEntity>,
  ) {
    super();
  }

  async listRoles(
    page: number,
    limit: number,
  ): Promise<AccessPage<RoleEntity>> {
    const [items, total] = await this.roles.findAndCount({
      relations: { permissions: true },
      order: { name: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total };
  }

  findRoleWithPermissionsAndUsers(id: string): Promise<RoleEntity | null> {
    return this.roles.findOne({
      where: { id },
      relations: { permissions: true, users: true },
    });
  }

  findRoleWithUsers(id: string): Promise<RoleEntity | null> {
    return this.roles.findOne({ where: { id }, relations: { users: true } });
  }

  findRoleById(id: string): Promise<RoleEntity | null> {
    return this.roles.findOneBy({ id });
  }

  roleSlugExists(slug: string): Promise<boolean> {
    return this.roles.exists({ where: { slug } });
  }

  createRole(data: Partial<RoleEntity>): Promise<RoleEntity> {
    return this.roles.save(this.roles.create(data));
  }

  saveRole(role: RoleEntity): Promise<RoleEntity> {
    return this.roles.save(role);
  }

  async removeRole(role: RoleEntity): Promise<void> {
    await this.roles.remove(role);
  }

  addPermissionToRole(
    roleId: string,
    permissionId: string,
    actorId: string,
  ): Promise<RolePermissionResult> {
    return this.roles.manager.transaction(async (manager) => {
      const role = await manager.findOne(RoleEntity, {
        where: { id: roleId },
        relations: { permissions: true },
      });
      if (!role) return { status: 'role-not-found' };

      const permission = await manager.findOneBy(PermissionEntity, {
        id: permissionId,
      });
      if (!permission) return { status: 'permission-not-found' };
      if (role.permissions.some(({ id }) => id === permissionId)) {
        return { status: 'unchanged', role };
      }

      role.permissions = [...role.permissions, permission];
      await manager.save(role);
      await manager.query(
        `INSERT INTO "audit_logs" ("actor_user_id", "action", "resource_type", "resource_id", "metadata")
         VALUES ($1, $2, $3, $4, $5::jsonb)`,
        [
          actorId,
          'role.permission.added',
          'role',
          roleId,
          JSON.stringify({ permissionId }),
        ],
      );
      return { status: 'updated', role };
    });
  }

  removePermissionFromRole(
    roleId: string,
    permissionId: string,
    actorId: string,
  ): Promise<RolePermissionResult> {
    return this.roles.manager.transaction(async (manager) => {
      const role = await manager.findOne(RoleEntity, {
        where: { id: roleId },
        relations: { permissions: true },
      });
      if (!role) return { status: 'role-not-found' };

      const permission = await manager.findOneBy(PermissionEntity, {
        id: permissionId,
      });
      if (!permission) return { status: 'permission-not-found' };
      if (!role.permissions.some(({ id }) => id === permissionId)) {
        return { status: 'unchanged', role };
      }

      role.permissions = role.permissions.filter(
        ({ id }) => id !== permissionId,
      );
      await manager.save(role);
      await manager.query(
        `INSERT INTO "audit_logs" ("actor_user_id", "action", "resource_type", "resource_id", "metadata")
         VALUES ($1, $2, $3, $4, $5::jsonb)`,
        [
          actorId,
          'role.permission.removed',
          'role',
          roleId,
          JSON.stringify({ permissionId }),
        ],
      );
      return { status: 'updated', role };
    });
  }

  async listPermissions(
    page: number,
    limit: number,
    search?: string,
  ): Promise<AccessPage<PermissionEntity>> {
    const query = this.permissions
      .createQueryBuilder('permission')
      .orderBy('permission.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);
    if (search?.trim()) {
      query.where(
        'permission.slug ILIKE :search OR permission.name ILIKE :search',
        { search: `%${search.trim()}%` },
      );
    }
    const [items, total] = await query.getManyAndCount();
    return { items, total };
  }

  findPermissionWithRoles(id: string): Promise<PermissionEntity | null> {
    return this.permissions.findOne({
      where: { id },
      relations: { roles: true },
    });
  }

  findPermissionBySlugWithRoles(
    slug: string,
  ): Promise<PermissionEntity | null> {
    return this.permissions.findOne({
      where: { slug },
      relations: { roles: true },
    });
  }

  findPermissionById(id: string): Promise<PermissionEntity | null> {
    return this.permissions.findOneBy({ id });
  }

  permissionSlugExists(slug: string): Promise<boolean> {
    return this.permissions.exists({ where: { slug } });
  }

  createPermission(data: Partial<PermissionEntity>): Promise<PermissionEntity> {
    return this.permissions.save(this.permissions.create(data));
  }

  savePermission(permission: PermissionEntity): Promise<PermissionEntity> {
    return this.permissions.save(permission);
  }

  async removePermission(permission: PermissionEntity): Promise<void> {
    await this.permissions.remove(permission);
  }
}
