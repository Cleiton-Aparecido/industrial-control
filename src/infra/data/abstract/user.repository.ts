import { UserEntity } from '../entities/user.entity';

export type CreateUserData = {
  name: string;
  email: string;
  password: string;
  isActive?: boolean;
  mustChangePassword?: boolean;
};

export type UpdateUserData = Partial<Pick<UserEntity, 'name' | 'email'>>;
export type UserPage = { items: UserEntity[]; total: number };

export abstract class IUserRepository {
  abstract create(data: CreateUserData): Promise<UserEntity>;
  abstract findById(id: string): Promise<UserEntity | null>;
  abstract findByEmail(email: string): Promise<UserEntity | null>;
  abstract findForAuthorization(id: string): Promise<UserEntity | null>;
  abstract findAll(): Promise<UserEntity[]>;
  abstract findPage(page: number, limit: number): Promise<UserPage>;
  abstract update(id: string, data: UpdateUserData): Promise<UserEntity | null>;
  abstract updatePassword(id: string, passwordHash: string): Promise<boolean>;
  abstract replacePasswordHash(
    id: string,
    passwordHash: string,
  ): Promise<boolean>;
  abstract invalidateSessions(id: string): Promise<boolean>;
  abstract setActive(id: string, isActive: boolean): Promise<boolean>;
  abstract resetPassword(id: string, passwordHash: string): Promise<boolean>;
  abstract assignRoles(id: string, roleIds: string[]): Promise<void>;
  abstract delete(id: string): Promise<boolean>;
}
