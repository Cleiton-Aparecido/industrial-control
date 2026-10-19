import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { IAccessRepository } from '../abstract/access.repository';
import { AuditLogService } from 'src/infra/data/audit-log.service';
import { isUniqueConstraintViolation } from 'src/infra/data/is-unique-constraint-violation';
import { PermissionEntity } from 'src/infra/access/entities/permission.entity';
import { RoleEntity } from 'src/infra/access/entities/role.entity';
import { CreatePermissionDto } from '../../../modules/access/application/dto/create-permission.dto';
import { CreateRoleDto } from '../../../modules/access/application/dto/create-role.dto';
import { UpdatePermissionDto } from '../../../modules/access/application/dto/update-permission.dto';
import { UpdateRoleDto } from '../../../modules/access/application/dto/update-role.dto';

@Injectable()
export class RbacService {
  constructor(
    @Inject(IAccessRepository)
    private readonly access: IAccessRepository,
    private readonly audit: AuditLogService,
  ) {}

  async listRoles(page = 1, limit = 25) {
    page = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;
    limit = Math.min(100, Math.max(1, Math.floor(limit)));
    const { items: rows, total } = await this.access.listRoles(page, limit);
    return {
      items: rows.map((role) => this.roleResponse(role)),
      total,
      page,
      limit,
    };
  }

  async getRole(id: string) {
    const role = await this.access.findRoleWithPermissionsAndUsers(id);
    if (!role) throw new NotFoundException('Papel não encontrado');
    return {
      ...this.roleResponse(role),
      users: role.users.map(({ id: userId, name, email }) => ({
        id: userId,
        name,
        email,
      })),
    };
  }

  async createRole(input: CreateRoleDto, actorId: string) {
    if (await this.access.roleSlugExists(input.slug)) {
      throw new ConflictException('Slug de papel já cadastrado');
    }
    let role: RoleEntity;
    try {
      role = await this.access.createRole({ ...input, isSystem: false });
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new ConflictException('Slug de papel já cadastrado');
      }
      throw error;
    }
    await this.audit.record(actorId, 'role.created', 'role', role.id, {
      slug: role.slug,
    });
    return this.roleResponse(role);
  }

  async updateRole(id: string, input: UpdateRoleDto, actorId: string) {
    const role = await this.access.findRoleById(id);
    if (!role) throw new NotFoundException('Papel não encontrado');
    if (role.isSystem) {
      throw new ForbiddenException('Papel de sistema não pode ser alterado');
    }
    Object.assign(role, input);
    await this.access.saveRole(role);
    await this.audit.record(actorId, 'role.updated', 'role', id, {
      changedFields: Object.keys(input),
    });
    return this.roleResponse(role);
  }

  async deleteRole(id: string, actorId: string): Promise<void> {
    const role = await this.access.findRoleWithUsers(id);
    if (!role) throw new NotFoundException('Papel não encontrado');
    if (role.isSystem) {
      throw new ForbiddenException('Papel de sistema não pode ser excluído');
    }
    if (role.users.length > 0) {
      throw new ConflictException(
        'Remova o papel dos usuários antes de excluí-lo',
      );
    }
    await this.access.removeRole(role);
    await this.audit.record(actorId, 'role.deleted', 'role', id, {
      slug: role.slug,
    });
  }

  async addPermissionToRole(
    roleId: string,
    permissionId: string,
    actorId: string,
  ) {
    const result = await this.access.addPermissionToRole(
      roleId,
      permissionId,
      actorId,
    );

    if (result.status === 'role-not-found') {
      throw new NotFoundException('Papel não encontrado');
    }

    if (result.status === 'permission-not-found') {
      throw new NotFoundException('Permissão não encontrada');
    }

    return this.roleResponse(result.role);
  }

  async removePermissionFromRole(
    roleId: string,
    permissionId: string,
    actorId: string,
  ) {
    const result = await this.access.removePermissionFromRole(
      roleId,
      permissionId,
      actorId,
    );
    if (result.status === 'role-not-found') {
      throw new NotFoundException('Papel não encontrado');
    }
    if (result.status === 'permission-not-found') {
      throw new NotFoundException('Permissão não encontrada');
    }
    return this.roleResponse(result.role);
  }

  async listPermissions(page = 1, limit = 25, search?: string) {
    page = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;
    limit = Math.min(100, Math.max(1, Math.floor(limit)));
    const { items: rows, total } = await this.access.listPermissions(
      page,
      limit,
      search,
    );
    return {
      items: rows.map((item) => this.permissionResponse(item)),
      total,
      page,
      limit,
    };
  }

  async getPermission(id: string) {
    const permission = await this.access.findPermissionWithRoles(id);
    if (!permission) throw new NotFoundException('Permissão não encontrada');
    return {
      ...this.permissionResponse(permission),
      roles: permission.roles.map(({ id: roleId, name, slug }) => ({
        id: roleId,
        name,
        slug,
      })),
    };
  }

  async getPermissionBySlug(slug: string) {
    const permission = await this.access.findPermissionBySlugWithRoles(slug);
    if (!permission) throw new NotFoundException('Permissão não encontrada');
    return {
      ...this.permissionResponse(permission),
      roles: permission.roles.map(({ id: roleId, name, slug: roleSlug }) => ({
        id: roleId,
        name,
        slug: roleSlug,
      })),
    };
  }

  async createPermission(input: CreatePermissionDto, actorId: string) {
    if (await this.access.permissionSlugExists(input.slug)) {
      throw new ConflictException('Slug de permissão já cadastrado');
    }
    let permission: PermissionEntity;
    try {
      permission = await this.access.createPermission({
        ...input,
        isSystem: false,
      });
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new ConflictException('Slug de permissão já cadastrado');
      }
      throw error;
    }
    await this.audit.record(
      actorId,
      'permission.created',
      'permission',
      permission.id,
      {
        slug: permission.slug,
      },
    );
    return this.permissionResponse(permission);
  }

  async updatePermission(
    id: string,
    input: UpdatePermissionDto,
    actorId: string,
  ) {
    const permission = await this.access.findPermissionById(id);
    if (!permission) throw new NotFoundException('Permissão não encontrada');
    if (permission.isSystem) {
      throw new ForbiddenException(
        'Permissão de sistema não pode ser alterada',
      );
    }
    Object.assign(permission, input);
    await this.access.savePermission(permission);
    await this.audit.record(actorId, 'permission.updated', 'permission', id, {
      changedFields: Object.keys(input),
    });
    return this.permissionResponse(permission);
  }

  async deletePermission(id: string, actorId: string): Promise<void> {
    const permission = await this.access.findPermissionWithRoles(id);
    if (!permission) throw new NotFoundException('Permissão não encontrada');
    if (permission.isSystem) {
      throw new ForbiddenException(
        'Permissão de sistema não pode ser excluída',
      );
    }
    if (permission.roles.length > 0) {
      throw new ConflictException(
        'Remova a permissão dos papéis antes de excluí-la',
      );
    }
    await this.access.removePermission(permission);
    await this.audit.record(actorId, 'permission.deleted', 'permission', id, {
      slug: permission.slug,
    });
  }

  private roleResponse(role: RoleEntity) {
    return {
      id: role.id,
      name: role.name,
      slug: role.slug,
      description: role.description,
      isSystem: role.isSystem,
      permissions:
        role.permissions?.map(({ id, name, slug }) => ({ id, name, slug })) ??
        [],
    };
  }

  private permissionResponse(permission: PermissionEntity) {
    return {
      id: permission.id,
      name: permission.name,
      slug: permission.slug,
      description: permission.description,
      isSystem: permission.isSystem,
    };
  }
}
