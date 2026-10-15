import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DataConfigOptions } from './data.config';
import { UserEntity } from './entities/user.entity';
import { IUserRepository } from './abstract/user.repository';
import { UserRepository } from './impl/user.repository';
import { RoleEntity } from './entities/role.entity';
import { PermissionEntity } from './entities/permission.entity';
import { AuditLogEntity } from './entities/audit-log.entity';
import { AuditLogService } from './audit-log.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forRoot(DataConfigOptions),
    TypeOrmModule.forFeature([
      UserEntity,
      RoleEntity,
      PermissionEntity,
      AuditLogEntity,
    ]),
  ],

  providers: [
    AuditLogService,
    {
      provide: IUserRepository,
      useClass: UserRepository,
    },
  ],

  exports: [IUserRepository, AuditLogService],
})
export class DataModule {}
