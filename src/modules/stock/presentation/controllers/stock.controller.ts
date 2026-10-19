import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from 'src/infra/auth/decorator/current-user.decorator';
import { RequirePermissions } from 'src/infra/auth/auth-metadata';
import type { AuthenticatedUser } from 'src/infra/auth/service/auth.service';
import {
  CorrectStockMovementDto,
  StockBalancesPageResponseDto,
  StockMovementDto,
  StockMovementQueryDto,
  StockMovementResponseDto,
  StockMovementsPageResponseDto,
} from '../../application/dto/stock.dto';
import { CorrectStockMovementUseCase } from '../../application/use-cases/correct-stock-movement.use-case';
import { FindStockMovementByIdUseCase } from '../../application/use-cases/find-stock-movement-by-id.use-case';
import { ListStockBalancesUseCase } from '../../application/use-cases/list-stock-balances.use-case';
import { ListStockMovementsUseCase } from '../../application/use-cases/list-stock-movements.use-case';
import { AdjustStockUseCase } from '../../application/use-cases/adjust-stock.use-case';
import { RegisterStockEntryUseCase } from '../../application/use-cases/register-stock-entry.use-case';
import { RegisterStockExitUseCase } from '../../application/use-cases/register-stock-exit.use-case';
import {
  ApiCommonResponses,
  ApiOk,
  ApiPageQueries,
  ApiPaged,
  pagination,
} from 'src/shared/http/operations-api.decorators';

@ApiTags('Stock')
@ApiBearerAuth('access-token')
@ApiCommonResponses()
@Controller('stock')
export class StockController {
  constructor(
    private readonly registerStockEntry: RegisterStockEntryUseCase,
    private readonly registerStockExit: RegisterStockExitUseCase,
    private readonly adjustStock: AdjustStockUseCase,
    private readonly listStockBalances: ListStockBalancesUseCase,
    private readonly listStockMovements: ListStockMovementsUseCase,
    private readonly findStockMovementById: FindStockMovementByIdUseCase,
    private readonly correctStockMovement: CorrectStockMovementUseCase,
  ) {}

  @Post('entries')
  @RequirePermissions('stock.entry')
  @ApiOperation({
    summary: 'Registrar entrada de estoque',
    description:
      'Aumenta o saldo físico e registra quantidade anterior/posterior, motivo e usuário autenticado.',
  })
  @ApiBody({ type: StockMovementDto })
  @ApiCreatedResponse({
    description:
      'Entrada registrada. Repetições com a mesma Idempotency-Key não duplicam a operação.',
    type: StockMovementResponseDto,
  })
  entry(
    @Body() body: StockMovementDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.registerStockEntry.execute(body, actor.sub);
  }

  @Post('exits')
  @RequirePermissions('stock.exit')
  @ApiOperation({
    summary: 'Registrar saída autorizada',
    description:
      'Não permite consumir quantidades já reservadas nem deixar saldo disponível negativo.',
  })
  @ApiBody({ type: StockMovementDto })
  @ApiCreatedResponse({
    description: 'Saída registrada.',
    type: StockMovementResponseDto,
  })
  exit(
    @Body() body: StockMovementDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.registerStockExit.execute(body, actor.sub);
  }

  @Post('adjustments')
  @RequirePermissions('stock.adjust')
  @ApiOperation({
    summary: 'Ajustar saldo de estoque',
    description:
      'Informe movementType como ADJUSTMENT_IN ou ADJUSTMENT_OUT e justifique a operação.',
  })
  @ApiBody({ type: StockMovementDto })
  @ApiCreatedResponse({
    description: 'Ajuste registrado como movimentação imutável.',
    type: StockMovementResponseDto,
  })
  adjustment(
    @Body() body: StockMovementDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.adjustStock.execute(body, actor.sub);
  }

  @Get('balances')
  @RequirePermissions('stock.read')
  @ApiOperation({
    summary: 'Listar saldos de estoque',
    description:
      'Quantidade disponível é calculada como física menos reservada.',
  })
  @ApiPageQueries()
  @ApiPaged(
    StockBalancesPageResponseDto,
    'Lista paginada dos saldos por produto.',
  )
  balances(@Query('page') page?: string, @Query('limit') limit?: string) {
    const paging = pagination(page, limit);
    return this.listStockBalances.execute(paging.page, paging.limit);
  }

  @Get('movements')
  @RequirePermissions('stock.movements.read')
  @ApiOperation({
    summary: 'Consultar movimentações de estoque',
    description:
      'Filtra por tipo, produto, usuário responsável, pedido e intervalo ISO de datas.',
  })
  @ApiPageQueries()
  @ApiQuery({
    name: 'type',
    required: false,
    enum: [
      'ENTRY',
      'EXIT',
      'ADJUSTMENT_IN',
      'ADJUSTMENT_OUT',
      'RESERVATION',
      'RELEASE',
    ],
  })
  @ApiQuery({ name: 'productId', required: false, format: 'uuid' })
  @ApiQuery({ name: 'userId', required: false, format: 'uuid' })
  @ApiQuery({ name: 'orderId', required: false, format: 'uuid' })
  @ApiQuery({ name: 'from', required: false, example: '2026-10-01T00:00:00Z' })
  @ApiQuery({ name: 'to', required: false, example: '2026-10-31T23:59:59Z' })
  @ApiPaged(
    StockMovementsPageResponseDto,
    'Lista paginada e filtrada do histórico imutável.',
  )
  movements(
    @Query() filters: StockMovementQueryDto,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const paging = pagination(page, limit);
    return this.listStockMovements.execute(filters, paging.page, paging.limit);
  }

  @Get('movements/:id')
  @RequirePermissions('stock.movements.read')
  @ApiOperation({ summary: 'Consultar movimentação por ID' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOk(StockMovementResponseDto, 'Movimentação encontrada.')
  getMovement(@Param('id', ParseUUIDPipe) id: string) {
    return this.findStockMovementById.execute(id);
  }

  @Post('movements/:id/corrections')
  @RequirePermissions('stock.adjust')
  @ApiOperation({
    summary: 'Corrigir movimentação',
    description:
      'Cria uma movimentação compensatória vinculada à original; não edita nem exclui o registro original.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiBody({ type: CorrectStockMovementDto })
  @ApiCreatedResponse({
    description: 'Movimento compensatório criado.',
    type: StockMovementResponseDto,
  })
  correctMovement(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: CorrectStockMovementDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.correctStockMovement.execute(id, body, actor.sub);
  }
}
