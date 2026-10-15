import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { DataModule } from 'src/infra/data/data.modules';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';

@Module({
  imports: [
    ConfigModule,
    DataModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.getOrThrow<string>('JWT_SECRET');
        const algorithm = config.getOrThrow<string>('JWT_ALGORITHM');
        const expiresIn = Number(config.getOrThrow<string>('JWT_EXPIRES_IN'));

        if (secret.length < 32) {
          throw new Error('JWT_SECRET must contain at least 32 characters');
        }
        if (algorithm !== 'HS256') {
          throw new Error('JWT_ALGORITHM must be HS256');
        }
        if (!Number.isInteger(expiresIn) || expiresIn < 60) {
          throw new Error(
            'JWT_EXPIRES_IN must be an integer of at least 60 seconds',
          );
        }

        return {
          secret,
          signOptions: { expiresIn, algorithm: 'HS256' as const },
          verifyOptions: { algorithms: ['HS256'] as const },
        };
      },
    }),
  ],
  providers: [
    AuthService,
    JwtAuthGuard,
    PermissionsGuard,
    { provide: APP_GUARD, useExisting: JwtAuthGuard },
    { provide: APP_GUARD, useExisting: PermissionsGuard },
  ],
  exports: [AuthService, JwtAuthGuard],
})
export class AuthInfrastructureModule {}
