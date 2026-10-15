import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { compare as compareBcrypt } from 'bcryptjs';

export interface AccessTokenClaims {
  sub: string;
  ver: number;
  pwd?: true;
}

export interface AuthenticatedUser {
  sub: string;
  name: string;
  email: string;
  mustChangePassword: boolean;
  roleSlugs: string[];
  permissions: string[];
}

export interface PasswordVerification {
  valid: boolean;
  rehashedPassword?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  getAccessTokenTtl(): number {
    return Number(this.config.getOrThrow<string>('JWT_EXPIRES_IN'));
  }

  hashPassword(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });
  }

  async verifyPassword(
    password: string,
    passwordHash: string,
  ): Promise<PasswordVerification> {
    try {
      if (passwordHash.startsWith('$argon2')) {
        const valid = await argon2.verify(passwordHash, password);
        return {
          valid,
          ...(valid && !passwordHash.startsWith('$argon2id$')
            ? { rehashedPassword: await this.hashPassword(password) }
            : {}),
        };
      }

      if (/^\$2[aby]\$/.test(passwordHash)) {
        const compatibleHash = passwordHash.replace(/^\$2y\$/, () => '$2b$');
        const valid = await compareBcrypt(password, compatibleHash);
        return {
          valid,
          ...(valid
            ? { rehashedPassword: await this.hashPassword(password) }
            : {}),
        };
      }
    } catch {
      return { valid: false };
    }

    return { valid: false };
  }

  signAccessToken(
    userId: string,
    tokenVersion: number,
    mustChangePassword = false,
  ) {
    return this.jwtService.signAsync({
      sub: userId,
      ver: tokenVersion,
      ...(mustChangePassword ? { pwd: true } : {}),
    });
  }

  async verifyAccessToken(token: string): Promise<AccessTokenClaims> {
    const payload = await this.jwtService.verifyAsync<AccessTokenClaims>(
      token,
      {
        algorithms: ['HS256'],
      },
    );

    if (
      typeof payload.sub !== 'string' ||
      !Number.isInteger(payload.ver) ||
      (payload.pwd !== undefined && payload.pwd !== true)
    ) {
      throw new Error('Invalid access token payload');
    }

    return payload;
  }
}
