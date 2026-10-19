import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IAccessRepository } from './abstract/access.repository';
import { AccessRepository } from './impl/access.repository';
import { RbacService } from './services/rbac.service';
import { PermissionEntity } from './entities/permission.entity';
import { RoleEntity } from './entities/role.entity';
import { AuditLogInfrastructureModule } from '../data/audit-log.module';
import { DataModule } from '../data/data.module';

@Module({
  imports: [
    DataModule,
    AuditLogInfrastructureModule,
    TypeOrmModule.forFeature([RoleEntity, PermissionEntity]),
  ],
  providers: [
    RbacService,
    { provide: IAccessRepository, useClass: AccessRepository },
  ],
  exports: [RbacService],
})
export class AccessInfrastructureModule {}
