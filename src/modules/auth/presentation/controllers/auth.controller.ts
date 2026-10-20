import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { AuthenticatedUser } from 'src/infra/auth/service/auth.service';
import { CurrentUser } from 'src/infra/auth/decorator/current-user.decorator';
import {
  AllowPasswordChange,
  PermissionFree,
  Public,
} from 'src/infra/auth/auth-metadata';
import { ChangePasswordDto } from '../../application/dto/change-password.dto';
import { LoginDto } from '../../application/dto/login.dto';
import { ChangePasswordUseCase } from '../../application/use-cases/change-password.usecase';
import { LoginUseCase } from '../../application/use-cases/login.usecase';
import { LogoutUseCase } from '../../application/use-cases/logout.usecase';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly loginUser: LoginUseCase,
    private readonly changePassword: ChangePasswordUseCase,
    private readonly logoutUser: LogoutUseCase,
  ) {}

  @Post('login')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Autenticar e emitir um JWT' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'JWT emitido com sucesso.' })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas.' })
  login(@Body() body: LoginDto) {
    return this.loginUser.execute(body);
  }

  @Get('me')
  @PermissionFree()
  @ApiOperation({ summary: 'Consultar o próprio perfil' })
  me(@CurrentUser() user: AuthenticatedUser) {
    return {
      id: user.sub,
      name: user.name,
      email: user.email,
      roles: user.roleSlugs,
      permissions: user.permissions,
      mustChangePassword: user.mustChangePassword,
    };
  }

  @Post('password/change')
  @HttpCode(HttpStatus.OK)
  @PermissionFree()
  @AllowPasswordChange()
  @ApiOperation({ summary: 'Alterar senha e invalidar sessões anteriores' })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Senha alterada; novo JWT emitido.',
  })
  @ApiResponse({
    status: 400,
    description: 'Senha atual ou confirmação inválida.',
  })
  changeOwnPassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: ChangePasswordDto,
  ) {
    return this.changePassword.execute(user.sub, body);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @PermissionFree()
  @ApiOperation({ summary: 'Revogar as sessões do usuário atual' })
  async logout(@CurrentUser() user: AuthenticatedUser): Promise<void> {
    await this.logoutUser.execute(user.sub);
  }
}
