import { Module } from '@nestjs/common';
import { DataModule } from 'src/infra/data/data.modules';
import { UserController } from './presentation/users.controller';
import { FindUserByIdUseCase } from './use-case/find-user-by-id.use-case';
import { FindUserByEmailUseCase } from './use-case/find-user-by-email.use-case';
import { ListUsersUseCase } from './use-case/list-users.use-case';
import { UpdateUserUseCase } from './use-case/update-user.use-case';
import { DeleteUserUseCase } from './use-case/delete-user.use-case';
import { CreateUserUseCase } from './use-case/create-user.use-case';
import { AuthInfrastructureModule } from 'src/infra/auth/auth.modules';
import { SetUserStatusUseCase } from './use-case/set-user-status.use-case';
import { ResetUserPasswordUseCase } from './use-case/reset-user-password.use-case';
import { AssignUserRolesUseCase } from './use-case/assign-user-roles.use-case';

@Module({
  imports: [DataModule, AuthInfrastructureModule],

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
