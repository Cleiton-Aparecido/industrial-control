import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AuditLogService } from 'src/infra/data/audit-log.service';
import { isUniqueConstraintViolation } from 'src/infra/data/is-unique-constraint-violation';
import { PermissionEntity } from 'src/infra/data/entities/permission.entity';
import { RoleEntity } from 'src/infra/data/entities/role.entity';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RbacService {
  constructor(
    @InjectRepository(RoleEntity)
    private readonly roles: Repository<RoleEntity>,
    @InjectRepository(PermissionEntity)
    private readonly permissions: Repository<PermissionEntity>,
    private readonly audit: AuditLogService,
  ) {}

  async listRoles(page = 1, limit = 25) {
    page = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;
    limit = Math.min(100, Math.max(1, Math.floor(limit)));
    const [rows, total] = await this.roles.findAndCount({
      relations: { permissions: true },
      order: { name: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return {
      items: rows.map((role) => this.roleResponse(role)),
      total,
      page,
      limit,
    };
  }

  async getRole(id: string) {
    const role = await this.roles.findOne({
      where: { id },
      relations: { permissions: true, users: true },
    });
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
    if (await this.roles.exists({ where: { slug: input.slug } })) {
      throw new ConflictException('Slug de papel já cadastrado');
    }
    let role: RoleEntity;
    try {
      role = await this.roles.save(
        this.roles.create({ ...input, isSystem: false }),
      );
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
    const role = await this.roles.findOneBy({ id });
    if (!role) throw new NotFoundException('Papel não encontrado');
    if (role.isSystem) {
      throw new ForbiddenException('Papel de sistema não pode ser alterado');
    }
    Object.assign(role, input);
    await this.roles.save(role);
    await this.audit.record(actorId, 'role.updated', 'role', id, {
      changedFields: Object.keys(input),
    });
    return this.roleResponse(role);
  }

  async deleteRole(id: string, actorId: string): Promise<void> {
    const role = await this.roles.findOne({
      where: { id },
      relations: { users: true },
    });
    if (!role) throw new NotFoundException('Papel não encontrado');
    if (role.isSystem) {
      throw new ForbiddenException('Papel de sistema não pode ser excluído');
    }
    if (role.users.length > 0) {
      throw new ConflictException(
        'Remova o papel dos usuários antes de excluí-lo',
      );
    }
    await this.roles.remove(role);
    await this.audit.record(actorId, 'role.deleted', 'role', id, {
      slug: role.slug,
    });
  }

  async assignPermissions(
    roleId: string,
    permissionIds: string[],
    actorId: string,
  ) {
    return this.roles.manager.transaction(async (manager) => {
      const role = await manager.findOne(RoleEntity, {
        where: { id: roleId },
        relations: { permissions: true },
      });
      if (!role) throw new NotFoundException('Papel não encontrado');
      if (role.isSystem) {
        throw new ForbiddenException(
          'Permissões do papel de sistema são protegidas',
        );
      }
      const permissions = permissionIds.length
        ? await manager.findBy(PermissionEntity, { id: In(permissionIds) })
        : [];
      if (permissions.length !== permissionIds.length) {
        throw new NotFoundException(
          'Uma ou mais permissões não foram encontradas',
        );
      }
      role.permissions = permissions;
      await manager.save(role);
      await manager.query(
        `INSERT INTO "audit_logs" ("actor_user_id", "action", "resource_type", "resource_id", "metadata")
         VALUES ($1, $2, $3, $4, $5::jsonb)`,
        [
          actorId,
          'role.permissions.updated',
          'role',
          roleId,
          JSON.stringify({ permissionIds }),
        ],
      );
      return this.roleResponse(role);
    });
  }

  async listPermissions(page = 1, limit = 25, search?: string) {
    page = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;
    limit = Math.min(100, Math.max(1, Math.floor(limit)));
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
    const [rows, total] = await query.getManyAndCount();
    return {
      items: rows.map((item) => this.permissionResponse(item)),
      total,
      page,
      limit,
    };
  }

  async getPermission(id: string) {
    const permission = await this.permissions.findOne({
      where: { id },
      relations: { roles: true },
    });
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
    const permission = await this.permissions.findOne({
      where: { slug },
      relations: { roles: true },
    });
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
    if (await this.permissions.exists({ where: { slug: input.slug } })) {
      throw new ConflictException('Slug de permissão já cadastrado');
    }
    let permission: PermissionEntity;
    try {
      permission = await this.permissions.save(
        this.permissions.create({ ...input, isSystem: false }),
      );
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
    const permission = await this.permissions.findOneBy({ id });
    if (!permission) throw new NotFoundException('Permissão não encontrada');
    if (permission.isSystem) {
      throw new ForbiddenException(
        'Permissão de sistema não pode ser alterada',
      );
    }
    Object.assign(permission, input);
    await this.permissions.save(permission);
    await this.audit.record(actorId, 'permission.updated', 'permission', id, {
      changedFields: Object.keys(input),
    });
    return this.permissionResponse(permission);
  }

  async deletePermission(id: string, actorId: string): Promise<void> {
    const permission = await this.permissions.findOne({
      where: { id },
      relations: { roles: true },
    });
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
    await this.permissions.remove(permission);
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
