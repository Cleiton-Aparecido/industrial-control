import { Module } from '@nestjs/common';
import { DataModule } from 'src/infra/data/data.modules';
import { AuthInfrastructureModule } from 'src/infra/auth/auth.modules';
import { AuthController } from './presentation/auth.controller';
import { LoginUseCase } from './application/use-case/login.usecase';
import { ChangePasswordUseCase } from './application/use-case/change-password.usecase';
import { LogoutUseCase } from './application/use-case/logout.usecase';

@Module({
  imports: [DataModule, AuthInfrastructureModule],
  controllers: [AuthController],
  providers: [LoginUseCase, ChangePasswordUseCase, LogoutUseCase],
})
export class AuthModule {}
