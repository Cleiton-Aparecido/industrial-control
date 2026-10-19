import * as argon2 from 'argon2';
import { hash as hashBcrypt } from 'bcryptjs';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from 'src/infra/auth/service/auth.service';

describe('AuthService', () => {
  let auth: AuthService;
  let jwt: jest.Mocked<Pick<JwtService, 'signAsync' | 'verifyAsync'>>;

  beforeEach(() => {
    jwt = {
      signAsync: jest.fn().mockResolvedValue('signed-token'),
      verifyAsync: jest.fn(),
    };
    const config = {
      getOrThrow: jest.fn().mockReturnValue('3600'),
    } as unknown as ConfigService;
    auth = new AuthService(jwt as unknown as JwtService, config);
  });

  it('hashes and verifies passwords with Argon2id', async () => {
    const hash = await auth.hashPassword('Correct-Horse-42');

    expect(hash.startsWith('$argon2id$')).toBe(true);
    await expect(argon2.verify(hash, 'Correct-Horse-42')).resolves.toBe(true);
    await expect(auth.verifyPassword('wrong-password', hash)).resolves.toEqual({
      valid: false,
    });
  });

  it('upgrades a valid legacy bcrypt hash without returning it', async () => {
    const legacyHash = await hashBcrypt('Legacy-Pass-42', 4);

    const result = await auth.verifyPassword('Legacy-Pass-42', legacyHash);

    expect(result.valid).toBe(true);
    expect(result.rehashedPassword?.startsWith('$argon2id$')).toBe(true);
    await expect(
      argon2.verify(result.rehashedPassword!, 'Legacy-Pass-42'),
    ).resolves.toBe(true);
  });

  it('signs a minimal password-change token claim set', async () => {
    await auth.signAccessToken('user-id', 4, true);

    expect(jwt.signAsync).toHaveBeenCalledWith({
      sub: 'user-id',
      ver: 4,
      pwd: true,
    });
  });

  it('verifies tokens using only HS256 and validates required claims', async () => {
    jwt.verifyAsync.mockResolvedValue({ sub: 'user-id', ver: 4 });

    await expect(auth.verifyAccessToken('token')).resolves.toEqual({
      sub: 'user-id',
      ver: 4,
    });
    expect(jwt.verifyAsync).toHaveBeenCalledWith('token', {
      algorithms: ['HS256'],
    });
  });
});
