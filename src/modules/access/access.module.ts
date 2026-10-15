import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthInfrastructureModule } from 'src/infra/auth/auth.modules';
import { DataModule } from 'src/infra/data/data.modules';
import { AuditLogService } from 'src/infra/data/audit-log.service';
import { PermissionEntity } from 'src/infra/data/entities/permission.entity';
import { RoleEntity } from 'src/infra/data/entities/role.entity';
import { PermissionsController } from './presentation/permissions.controller';
import { RolesController } from './presentation/roles.controller';
import { RbacService } from './rbac.service';

@Module({
  imports: [
    AuthInfrastructureModule,
    DataModule,
    TypeOrmModule.forFeature([RoleEntity, PermissionEntity]),
  ],
  controllers: [RolesController, PermissionsController],
  providers: [RbacService],
})
export class AccessModule {}
