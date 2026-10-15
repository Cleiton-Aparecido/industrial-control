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
import { CreatePermissionDto } from '../dto/create-permission.dto';
import { UpdatePermissionDto } from '../dto/update-permission.dto';
import { RbacService } from '../rbac.service';

@ApiTags('Permissions')
@ApiBearerAuth('access-token')
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly rbac: RbacService) {}

  @Post()
  @RequirePermissions('permissions.create')
  @ApiBody({ type: CreatePermissionDto })
  @ApiOperation({ summary: 'Criar permissão' })
  create(
    @Body() body: CreatePermissionDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.rbac.createPermission(body, actor.sub);
  }

  @Get()
  @RequirePermissions('permissions.read')
  @ApiQuery({ name: 'page', required: false, type: Number, minimum: 1 })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    minimum: 1,
    maximum: 100,
  })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiOperation({ summary: 'Listar permissões paginadas' })
  list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.rbac.listPermissions(
      Number(page) || 1,
      Number(limit) || 25,
      search,
    );
  }

  @Get('slug/:slug')
  @RequirePermissions('permissions.read')
  @ApiOperation({ summary: 'Consultar permissão por slug estável' })
  getBySlug(@Param('slug') slug: string) {
    return this.rbac.getPermissionBySlug(slug);
  }

  @Get(':id')
  @RequirePermissions('permissions.read')
  @ApiOperation({ summary: 'Consultar permissão e papéis associados' })
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.rbac.getPermission(id);
  }

  @Patch(':id')
  @RequirePermissions('permissions.update')
  @ApiBody({ type: UpdatePermissionDto })
  @ApiOperation({ summary: 'Atualizar nome e descrição da permissão' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdatePermissionDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.rbac.updatePermission(id, body, actor.sub);
  }

  @Delete(':id')
  @RequirePermissions('permissions.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiResponse({ status: 204, description: 'Permissão excluída.' })
  @ApiOperation({ summary: 'Excluir permissão sem associações' })
  delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.rbac.deletePermission(id, actor.sub);
  }
}
