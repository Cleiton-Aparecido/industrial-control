import { Module } from '@nestjs/common';
import { AuthInfrastructureModule } from 'src/infra/auth/auth.modules';
import { UsersInfrastructureModule } from 'src/infra/users/user.module';
import { AuditLogInfrastructureModule } from 'src/infra/data/audit-log.module';
import { AuthController } from './presentation/controllers/auth.controller';
import { LoginUseCase } from './application/use-cases/login.usecase';
import { ChangePasswordUseCase } from './application/use-cases/change-password.usecase';
import { LogoutUseCase } from './application/use-cases/logout.usecase';

@Module({
  imports: [
    AuthInfrastructureModule,
    UsersInfrastructureModule,
    AuditLogInfrastructureModule,
  ],
  controllers: [AuthController],
  providers: [LoginUseCase, ChangePasswordUseCase, LogoutUseCase],
})
export class AuthModule {}
