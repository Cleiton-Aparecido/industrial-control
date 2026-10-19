import { Module } from '@nestjs/common';
import { UsersInfrastructureModule } from 'src/infra/users/user.module';
import { AuditLogInfrastructureModule } from 'src/infra/data/audit-log.module';
import { UserController } from './presentation/controllers/users.controller';
import { FindUserByIdUseCase } from './application/use-cases/find-user-by-id.use-case';
import { FindUserByEmailUseCase } from './application/use-cases/find-user-by-email.use-case';
import { ListUsersUseCase } from './application/use-cases/list-users.use-case';
import { UpdateUserUseCase } from './application/use-cases/update-user.use-case';
import { DeleteUserUseCase } from './application/use-cases/delete-user.use-case';
import { CreateUserUseCase } from './application/use-cases/create-user.use-case';
import { AuthInfrastructureModule } from 'src/infra/auth/auth.modules';
import { SetUserStatusUseCase } from './application/use-cases/set-user-status.use-case';
import { ResetUserPasswordUseCase } from './application/use-cases/reset-user-password.use-case';
import { AssignUserRolesUseCase } from './application/use-cases/assign-user-roles.use-case';

@Module({
  imports: [
    UsersInfrastructureModule,
    AuditLogInfrastructureModule,
    AuthInfrastructureModule,
  ],

  controllers: [UserController],

  providers: [
    CreateUserUseCase,
    FindUserByIdUseCase,
    FindUserByEmailUseCase,
    ListUsersUseCase,
    UpdateUserUseCase,
    DeleteUserUseCase,
    SetUserStatusUseCase,
    ResetUserPasswordUseCase,
    AssignUserRolesUseCase,
  ],

  exports: [FindUserByIdUseCase, FindUserByEmailUseCase],
})
export class UsersModules {}
