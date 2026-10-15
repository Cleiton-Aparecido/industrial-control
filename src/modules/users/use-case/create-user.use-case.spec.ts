import { ConflictException } from '@nestjs/common';
import { AuthService } from 'src/infra/auth/auth.service';
import { AuditLogService } from 'src/infra/data/audit-log.service';
import { IUserRepository } from 'src/infra/data/abstract/user.repository';
import { CreateUserUseCase } from './create-user.use-case';

describe('CreateUserUseCase', () => {
  let users: jest.Mocked<Pick<IUserRepository, 'findByEmail' | 'create'>>;
  let auth: jest.Mocked<Pick<AuthService, 'hashPassword'>>;
  let audit: jest.Mocked<Pick<AuditLogService, 'record'>>;
  let useCase: CreateUserUseCase;

  beforeEach(() => {
    users = {
      findByEmail: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(async (input) => ({
        id: 'user-id',
        ...input,
      })),
    };
    auth = { hashPassword: jest.fn().mockResolvedValue('$argon2id$hash') };
    audit = { record: jest.fn().mockResolvedValue({} as never) };
    useCase = new CreateUserUseCase(
      users as unknown as IUserRepository,
      auth as unknown as AuthService,
      audit as unknown as AuditLogService,
    );
  });

  it('normalizes the email, persists only a hash, and requires password change', async () => {
    await useCase.execute(
      {
        name: ' Test User ',
        email: ' USER@Example.com ',
        password: 'Strong-Passphrase-42',
      },
      'admin-id',
    );

    expect(auth.hashPassword).toHaveBeenCalledWith('Strong-Passphrase-42');
    expect(users.create).toHaveBeenCalledWith({
      name: 'Test User',
      email: 'user@example.com',
      password: '$argon2id$hash',
      isActive: true,
      mustChangePassword: true,
    });
    expect(audit.record).toHaveBeenCalledWith(
      'admin-id',
      'user.created',
      'user',
      'user-id',
    );
  });

  it('rejects duplicate email before hashing', async () => {
    users.findByEmail.mockResolvedValue({ id: 'existing' } as never);

    await expect(
      useCase.execute(
        {
          name: 'Test User',
          email: 'user@example.com',
          password: 'Strong-Passphrase-42',
        },
        'admin-id',
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(auth.hashPassword).not.toHaveBeenCalled();
  });
});
