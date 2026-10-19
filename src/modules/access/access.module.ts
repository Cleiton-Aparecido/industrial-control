import { Module } from '@nestjs/common';
import { AuthInfrastructureModule } from 'src/infra/auth/auth.modules';
import { AccessInfrastructureModule } from 'src/infra/access/access.module';
import { PermissionsController } from './presentation/controllers/permissions.controller';
import { RolesController } from './presentation/controllers/roles.controller';

@Module({
  imports: [AuthInfrastructureModule, AccessInfrastructureModule],
  controllers: [RolesController, PermissionsController],
})
export class AccessModule {}
