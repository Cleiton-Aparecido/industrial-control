import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, ILike, In, Repository } from 'typeorm';
import { UserEntity } from '../entities/user.entity';
import { RoleEntity } from '../../access/entities/role.entity';
import {
  CreateUserData,
  IUserRepository,
  UpdateUserData,
} from '../abstract/user.repository';

@Injectable()
export class UserRepository extends IUserRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repository: Repository<UserEntity>,
  ) {
    super();
  }

  async create(data: CreateUserData): Promise<UserEntity> {
    const user = this.repository.create(data);
    return this.repository.save(user);
  }

  async findById(id: string): Promise<UserEntity | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.repository.findOne({ where: { email } });
  }

  async findForAuthorization(id: string): Promise<UserEntity | null> {
    return this.repository.findOne({
      where: { id },
      relations: { roles: { permissions: true } },
    });
  }

  async findAll(): Promise<UserEntity[]> {
    return this.repository.find({
      order: { createAt: 'DESC' },
    });
  }

  async findPage(page: number, limit: number, search?: string) {
    const term = search?.trim();
    const escaped = term?.replace(/[\\%_]/g, (char) => `\\${char}`);
    const [items, total] = await this.repository.findAndCount({
      where: escaped
        ? [
            { name: ILike(`%${escaped}%`) },
            { email: ILike(`%${escaped}%`) },
          ]
        : undefined,
      relations: { roles: true },
      order: { createAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total };
  }

  async update(id: string, data: UpdateUserData): Promise<UserEntity | null> {
    const user = await this.findById(id);

    if (!user) {
      return null;
    }

    Object.assign(user, data);
    return this.repository.save(user);
  }

  async updatePassword(id: string, passwordHash: string): Promise<boolean> {
    return this.repository.manager.transaction(async (manager) => {
      const result = await manager.update(UserEntity, id, {
        password: passwordHash,
        mustChangePassword: false,
      });
      if ((result.affected ?? 0) > 0) {
        await manager.increment(UserEntity, { id }, 'tokenVersion', 1);
      }
      return (result.affected ?? 0) > 0;
    });
  }

  async replacePasswordHash(
    id: string,
    passwordHash: string,
  ): Promise<boolean> {
    const result = await this.repository.update(id, { password: passwordHash });
    return (result.affected ?? 0) > 0;
  }

  async invalidateSessions(id: string): Promise<boolean> {
    const result = await this.repository.increment({ id }, 'tokenVersion', 1);
    return (result.affected ?? 0) > 0;
  }

  async setActive(id: string, isActive: boolean): Promise<boolean> {
    return this.repository.manager.transaction(async (manager) => {
      const user = await manager.findOne(UserEntity, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!user) return false;

      if (
        user.isActive &&
        !isActive &&
        (await this.hasAdministratorRole(manager, id))
      ) {
        await this.lockAdminRole(manager);
        if ((await this.countActiveAdmins(manager)) <= 1) {
          throw new ConflictException(
            'Não é possível desativar o último administrador ativo',
          );
        }
      }

      const result = await manager.update(UserEntity, id, {
        isActive,
        deactivatedAt: isActive ? null : new Date(),
      });
      if ((result.affected ?? 0) > 0) {
        await manager.increment(UserEntity, { id }, 'tokenVersion', 1);
      }
      return (result.affected ?? 0) > 0;
    });
  }

  async resetPassword(id: string, passwordHash: string): Promise<boolean> {
    return this.repository.manager.transaction(async (manager) => {
      const result = await manager.update(UserEntity, id, {
        password: passwordHash,
        mustChangePassword: true,
      });
      if ((result.affected ?? 0) > 0) {
        await manager.increment(UserEntity, { id }, 'tokenVersion', 1);
      }
      return (result.affected ?? 0) > 0;
    });
  }

  async assignRoles(id: string, roleIds: string[]): Promise<void> {
    await this.repository.manager.transaction(async (manager) => {
      const user = await manager.findOne(UserEntity, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!user) throw new NotFoundException('Usuário não encontrado');
      const roles = roleIds.length
        ? await manager.findBy(RoleEntity, { id: In(roleIds) })
        : [];
      if (roles.length !== roleIds.length) {
        throw new NotFoundException('Um ou mais papéis não foram encontrados');
      }
      const hasAdministrator = await this.hasAdministratorRole(manager, id);
      const willBeAdministrator = roles.some(
        (role) => role.slug === 'administrator',
      );
      if (user.isActive && hasAdministrator && !willBeAdministrator) {
        await this.lockAdminRole(manager);
        if ((await this.countActiveAdmins(manager)) <= 1) {
          throw new ConflictException(
            'Não é possível remover o último administrador ativo',
          );
        }
      }
      user.roles = roles;
      await manager.save(user);
      await manager.increment(UserEntity, { id }, 'tokenVersion', 1);
    });
  }

  async delete(id: string): Promise<boolean> {
    return this.repository.manager.transaction(async (manager) => {
      const user = await manager.findOne(UserEntity, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!user) return false;
      if (user.isActive && (await this.hasAdministratorRole(manager, id))) {
        await this.lockAdminRole(manager);
        if ((await this.countActiveAdmins(manager)) <= 1) {
          throw new ConflictException(
            'Não é possível excluir o último administrador ativo',
          );
        }
      }
      await manager.update(UserEntity, id, {
        isActive: false,
        deactivatedAt: new Date(),
      });
      await manager.increment(UserEntity, { id }, 'tokenVersion', 1);
      const result = await manager.softDelete(UserEntity, id);
      return (result.affected ?? 0) > 0;
    });
  }

  private async lockAdminRole(manager: EntityManager): Promise<void> {
    await manager.findOne(RoleEntity, {
      where: { slug: 'administrator' },
      lock: { mode: 'pessimistic_write' },
    });
  }

  private async hasAdministratorRole(
    manager: EntityManager,
    userId: string,
  ): Promise<boolean> {
    const rows = await manager.query(
      `SELECT 1 FROM "user_roles" ur
       INNER JOIN "roles" r ON r."id" = ur."role_id"
       WHERE ur."user_id" = $1 AND r."slug" = 'administrator' LIMIT 1`,
      [userId],
    );
    return rows.length > 0;
  }

  private async countActiveAdmins(manager: EntityManager): Promise<number> {
    return manager
      .createQueryBuilder(UserEntity, 'user')
      .innerJoin('user.roles', 'role', 'role.slug = :slug', {
        slug: 'administrator',
      })
      .where('user.isActive = true')
      .getCount();
  }
}
