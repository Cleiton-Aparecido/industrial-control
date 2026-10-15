import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthenticatedUser } from 'src/infra/auth/auth.service';
import { CurrentUser } from 'src/infra/auth/current-user.decorator';
import { RequirePermissions } from 'src/infra/auth/auth-metadata';
import { AssignPermissionsDto } from '../dto/assign-permissions.dto';
import { CreateRoleDto } from '../dto/create-role.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';
import { RbacService } from '../rbac.service';

@ApiTags('Roles')
@ApiBearerAuth('access-token')
@Controller('roles')
export class RolesController {
  constructor(private readonly rbac: RbacService) {}

  @Post()
  @RequirePermissions('roles.create')
  @ApiOperation({ summary: 'Criar papel' })
  create(@Body() body: CreateRoleDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.rbac.createRole(body, actor.sub);
  }

  @Get()
  @RequirePermissions('roles.read')
  @ApiQuery({ name: 'page', required: false, type: Number, minimum: 1 })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    minimum: 1,
    maximum: 100,
  })
  @ApiOperation({ summary: 'Listar papéis paginados' })
  list(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.rbac.listRoles(Number(page) || 1, Number(limit) || 25);
  }

  @Get(':id')
  @RequirePermissions('roles.read')
  @ApiOperation({ summary: 'Consultar papel, permissões e usuários' })
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.rbac.getRole(id);
  }

  @Patch(':id')
  @RequirePermissions('roles.update')
  @ApiBody({ type: UpdateRoleDto })
  @ApiOperation({ summary: 'Atualizar nome e descrição do papel' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateRoleDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.rbac.updateRole(id, body, actor.sub);
  }

  @Put(':id/permissions')
  @RequirePermissions('roles.assign')
  @ApiBody({ type: AssignPermissionsDto })
  @ApiOperation({ summary: 'Substituir as permissões de um papel' })
  assignPermissions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AssignPermissionsDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.rbac.assignPermissions(id, body.permissionIds, actor.sub);
  }

  @Delete(':id')
  @RequirePermissions('roles.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiResponse({ status: 204, description: 'Papel excluído.' })
  @ApiOperation({ summary: 'Excluir papel sem associações' })
  delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.rbac.deleteRole(id, actor.sub);
  }
}
