import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from 'src/infra/auth/service/auth.service';
import { IUserRepository } from 'src/infra/users/abstract/user.repository';
import { LoginUseCase } from 'src/modules/auth/application/use-cases/login.usecase';

describe('LoginUseCase', () => {
  let users: jest.Mocked<
    Pick<IUserRepository, 'findByEmail' | 'replacePasswordHash'>
  >;
  let auth: jest.Mocked<
    Pick<
      AuthService,
      'verifyPassword' | 'signAccessToken' | 'getAccessTokenTtl'
    >
  >;
  let useCase: LoginUseCase;

  beforeEach(() => {
    users = {
      findByEmail: jest.fn(),
      replacePasswordHash: jest.fn().mockResolvedValue(true),
    };
    auth = {
      verifyPassword: jest.fn().mockResolvedValue({ valid: true }),
      signAccessToken: jest.fn().mockResolvedValue('access-token'),
      getAccessTokenTtl: jest.fn().mockReturnValue(3600),
    };
    useCase = new LoginUseCase(
      users as unknown as IUserRepository,
      auth as unknown as AuthService,
    );
  });

  it('normalizes email and issues only a minimal user token', async () => {
    users.findByEmail.mockResolvedValue({
      id: 'user-id',
      name: 'Test User',
      email: 'user@example.com',
      password: '$argon2id$hash',
      isActive: true,
      tokenVersion: 3,
      mustChangePassword: false,
    } as never);

    const result = await useCase.execute({
      email: ' USER@Example.com ',
      password: 'Correct-Horse-42',
    });

    expect(users.findByEmail).toHaveBeenCalledWith('user@example.com');
    expect(auth.signAccessToken).toHaveBeenCalledWith('user-id', 3, false);
    expect(result).toMatchObject({
      accessToken: 'access-token',
      tokenType: 'Bearer',
      expiresIn: 3600,
    });
    expect(result).not.toHaveProperty('user.password');
  });

  it('returns the same credential error for missing and inactive accounts', async () => {
    users.findByEmail.mockResolvedValue(null);
    await expect(
      useCase.execute({ email: 'missing@example.com', password: 'password' }),
    ).rejects.toThrow(UnauthorizedException);

    users.findByEmail.mockResolvedValue({ isActive: false } as never);
    await expect(
      useCase.execute({ email: 'inactive@example.com', password: 'password' }),
    ).rejects.toThrow('E-mail ou senha inválidos');
  });

  it('rehashes a successful legacy password without revealing account state', async () => {
    users.findByEmail.mockResolvedValue({
      id: 'user-id',
      name: 'Test User',
      email: 'user@example.com',
      password: '$2b$legacy',
      isActive: true,
      tokenVersion: 0,
      mustChangePassword: true,
    } as never);
    auth.verifyPassword.mockResolvedValue({
      valid: true,
      rehashedPassword: '$argon2id$new-hash',
    });

    await useCase.execute({ email: 'user@example.com', password: 'password' });

    expect(users.replacePasswordHash).toHaveBeenCalledWith(
      'user-id',
      '$argon2id$new-hash',
    );
    expect(auth.signAccessToken).toHaveBeenCalledWith('user-id', 0, true);
  });
});
