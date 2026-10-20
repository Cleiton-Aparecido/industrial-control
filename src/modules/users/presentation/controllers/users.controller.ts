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
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthenticatedUser } from 'src/infra/auth/service/auth.service';
import { CurrentUser } from 'src/infra/auth/decorator/current-user.decorator';
import { RequirePermissions } from 'src/infra/auth/auth-metadata';
import { AssignUserRolesDto } from '../../application/dto/assign-user-roles.dto';
import { CreateUserInputDto } from '../../application/dto/create-user-input.dto';
import { ResetUserPasswordDto } from '../../application/dto/reset-user-password.dto';
import { SetUserStatusDto } from '../../application/dto/set-user-status.dto';
import { UpdateUserInputDto } from '../../application/dto/update-user-input.dto';
import { CreateUserUseCase } from '../../application/use-cases/create-user.use-case';
import { DeleteUserUseCase } from '../../application/use-cases/delete-user.use-case';
import { FindUserByIdUseCase } from '../../application/use-cases/find-user-by-id.use-case';
import { ListUsersUseCase } from '../../application/use-cases/list-users.use-case';
import { UpdateUserUseCase } from '../../application/use-cases/update-user.use-case';
import { SetUserStatusUseCase } from '../../application/use-cases/set-user-status.use-case';
import { ResetUserPasswordUseCase } from '../../application/use-cases/reset-user-password.use-case';
import { AssignUserRolesUseCase } from '../../application/use-cases/assign-user-roles.use-case';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@Controller('users')
export class UserController {
  constructor(
    private readonly createUser: CreateUserUseCase,
    private readonly findUserById: FindUserByIdUseCase,
    private readonly listUsers: ListUsersUseCase,
    private readonly updateUser: UpdateUserUseCase,
    private readonly deleteUser: DeleteUserUseCase,
    private readonly setUserStatus: SetUserStatusUseCase,
    private readonly resetUserPassword: ResetUserPasswordUseCase,
    private readonly assignUserRoles: AssignUserRolesUseCase,
  ) {}

  @Post()
  @RequirePermissions('users.create')
  @ApiOperation({
    summary: 'Criar usuário que trocará a senha no primeiro login',
  })
  @ApiBody({ type: CreateUserInputDto })
  @ApiResponse({ status: 201, description: 'Usuário criado.' })
  async create(
    @Body() body: CreateUserInputDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.toResponse(await this.createUser.execute(body, actor.sub));
  }

  @Get()
  @RequirePermissions('users.read')
  @ApiQuery({ name: 'page', required: false, type: Number, minimum: 1 })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    minimum: 1,
    maximum: 100,
  })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiOperation({ summary: 'Listar usuários paginados, com papéis' })
  @ApiResponse({ status: 200, description: 'Página de usuários retornada.' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    const result = await this.listUsers.execute(
      Number(page) || 1,
      Number(limit) || 25,
      search,
    );
    return {
      ...result,
      items: result.items.map((user) => this.toResponse(user)),
    };
  }

  @Get(':id')
  @RequirePermissions('users.read')
  @ApiOperation({ summary: 'Buscar usuário por ID' })
  @ApiParam({
    name: 'id',
    description: 'UUID do usuário',
    example: 'a1b2c3d4-e5f6-4789-8123-123456789abc',
  })
  @ApiResponse({ status: 200, description: 'Usuário encontrado.' })
  @ApiResponse({ status: 400, description: 'ID inválido.' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado.' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    const user = await this.findUserById.execute(id);
    return this.toResponse(user);
  }

  @Patch(':id')
  @RequirePermissions('users.update')
  @ApiOperation({ summary: 'Atualizar os dados do usuário' })
  @ApiParam({
    name: 'id',
    description: 'UUID do usuário',
    example: 'a1b2c3d4-e5f6-4789-8123-123456789abc',
  })
  @ApiBody({ type: UpdateUserInputDto })
  @ApiResponse({ status: 200, description: 'Usuário atualizado com sucesso.' })
  @ApiResponse({ status: 400, description: 'Dados ou ID inválidos.' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado.' })
  @ApiResponse({ status: 409, description: 'E-mail já cadastrado.' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateUserInputDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const user = await this.updateUser.execute(id, body, actor.sub);
    return this.toResponse(user);
  }

  @Patch(':id/status')
  @RequirePermissions('users.status')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Ativar ou desativar usuário' })
  @ApiBody({ type: SetUserStatusDto })
  async setStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: SetUserStatusDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<void> {
    await this.setUserStatus.execute(id, body.isActive, actor.sub);
  }

  @Put(':id/password')
  @RequirePermissions('users.password.reset')
  @ApiOperation({ summary: 'Redefinir senha e exigir troca no próximo login' })
  @ApiParam({
    name: 'id',
    description: 'UUID do usuário',
    example: 'a1b2c3d4-e5f6-4789-8123-123456789abc',
  })
  @ApiBody({ type: ResetUserPasswordDto })
  async resetPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ResetUserPasswordDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.resetUserPassword.execute(id, body.newPassword, actor.sub);
  }

  @Put(':id/roles')
  @RequirePermissions('roles.assign')
  @ApiBody({ type: AssignUserRolesDto })
  @ApiOperation({ summary: 'Substituir os papéis atribuídos ao usuário' })
  async assignRoles(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AssignUserRolesDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<void> {
    await this.assignUserRoles.execute(id, body.roleIds, actor.sub);
  }

  @Delete(':id')
  @RequirePermissions('users.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Excluir um usuário' })
  @ApiParam({
    name: 'id',
    description: 'UUID do usuário',
    example: 'a1b2c3d4-e5f6-4789-8123-123456789abc',
  })
  @ApiResponse({ status: 204, description: 'Usuário excluído com sucesso.' })
  @ApiResponse({ status: 400, description: 'ID inválido.' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado.' })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<void> {
    await this.deleteUser.execute(id, actor.sub);
  }

  private toResponse(user: {
    id: string;
    name: string;
    email: string;
    createAt: Date;
    updateAt: Date;
    isActive: boolean;
    mustChangePassword: boolean;
    deactivatedAt: Date | null;
    roles?: { id: string; name: string; slug: string }[];
  }) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createAt: user.createAt,
      updateAt: user.updateAt,
      isActive: user.isActive,
      mustChangePassword: user.mustChangePassword,
      deactivatedAt: user.deactivatedAt,
      ...(user.roles
        ? {
            roles: user.roles.map(({ id, name, slug }) => ({ id, name, slug })),
          }
        : {}),
    };
  }
}
