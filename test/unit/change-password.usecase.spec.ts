import { BadRequestException } from '@nestjs/common';
import { AuthService } from 'src/infra/auth/service/auth.service';
import { AuditLogService } from 'src/infra/data/audit-log.service';
import { IUserRepository } from 'src/infra/users/abstract/user.repository';
import { ChangePasswordUseCase } from 'src/modules/auth/application/use-cases/change-password.usecase';

describe('ChangePasswordUseCase', () => {
  let users: jest.Mocked<Pick<IUserRepository, 'findById' | 'updatePassword'>>;
  let auth: jest.Mocked<
    Pick<
      AuthService,
      | 'verifyPassword'
      | 'hashPassword'
      | 'signAccessToken'
      | 'getAccessTokenTtl'
    >
  >;
  let audit: jest.Mocked<Pick<AuditLogService, 'record'>>;
  let useCase: ChangePasswordUseCase;

  beforeEach(() => {
    users = {
      findById: jest
        .fn()
        .mockResolvedValueOnce({
          id: 'user-id',
          password: '$argon2id$old',
          isActive: true,
        } as never)
        .mockResolvedValueOnce({ id: 'user-id', tokenVersion: 8 } as never),
      updatePassword: jest.fn().mockResolvedValue(true),
    };
    auth = {
      verifyPassword: jest.fn().mockResolvedValue({ valid: true }),
      hashPassword: jest.fn().mockResolvedValue('$argon2id$new'),
      signAccessToken: jest.fn().mockResolvedValue('rotated-token'),
      getAccessTokenTtl: jest.fn().mockReturnValue(3600),
    };
    audit = { record: jest.fn().mockResolvedValue({} as never) };
    useCase = new ChangePasswordUseCase(
      users as unknown as IUserRepository,
      auth as unknown as AuthService,
      audit as unknown as AuditLogService,
    );
  });

  it('rejects a mismatched confirmation before persisting', async () => {
    await expect(
      useCase.execute('user-id', {
        currentPassword: 'old-password',
        newPassword: 'New-Passphrase-42',
        confirmNewPassword: 'Different-Passphrase-42',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(users.updatePassword).not.toHaveBeenCalled();
  });

  it('stores an Argon2id hash, audits without secrets, and returns a rotated token', async () => {
    const response = await useCase.execute('user-id', {
      currentPassword: 'old-password',
      newPassword: 'New-Passphrase-42',
      confirmNewPassword: 'New-Passphrase-42',
    });

    expect(users.updatePassword).toHaveBeenCalledWith(
      'user-id',
      '$argon2id$new',
    );
    expect(auth.signAccessToken).toHaveBeenCalledWith('user-id', 8);
    expect(audit.record).toHaveBeenCalledWith(
      'user-id',
      'user.password.changed',
      'user',
      'user-id',
    );
    expect(response.accessToken).toBe('rotated-token');
  });
});
