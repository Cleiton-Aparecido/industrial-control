import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IUserRepository } from './abstract/user.repository';
import { UserEntity } from './entities/user.entity';
import { UserRepository } from './impl/user.repository';
import { RoleEntity } from '../access/entities/role.entity';
import { DataModule } from '../data/data.module';

@Module({
  imports: [DataModule, TypeOrmModule.forFeature([UserEntity, RoleEntity])],
  providers: [{ provide: IUserRepository, useClass: UserRepository }],
  exports: [IUserRepository],
})
export class UsersInfrastructureModule {}
