import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from 'src/infra/auth/decorator/current-user.decorator';
import { RequirePermissions } from 'src/infra/auth/auth-metadata';
import type { AuthenticatedUser } from 'src/infra/auth/service/auth.service';
import { OrderStatus } from 'src/infra/orders/entities/order.entity';
import {
  CreateOrderDto,
  OrderResponseDto,
  OrdersPageResponseDto,
  OrderStatusHistoryResponseDto,
  OrderTransitionDto,
} from '../../application/dto/order.dto';
import { CancelOrderUseCase } from '../../application/use-cases/cancel-order.use-case';
import { CreateOrderUseCase } from '../../application/use-cases/create-order.use-case';
import { FindOrderByIdUseCase } from '../../application/use-cases/find-order-by-id.use-case';
import { GetOrderHistoryUseCase } from '../../application/use-cases/get-order-history.use-case';
import { ListOrdersUseCase } from '../../application/use-cases/list-orders.use-case';
import {
  ApiArray,
  ApiCommonResponses,
  ApiOk,
  ApiPageQueries,
  ApiPaged,
  pagination,
} from 'src/shared/http/operations-api.decorators';

@ApiTags('Orders')
@ApiBearerAuth('access-token')
@ApiCommonResponses()
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly createOrder: CreateOrderUseCase,
    private readonly listOrders: ListOrdersUseCase,
    private readonly findOrderById: FindOrderByIdUseCase,
    private readonly getOrderHistory: GetOrderHistoryUseCase,
    private readonly cancelOrder: CancelOrderUseCase,
  ) {}

  @Post()
  @RequirePermissions('orders.create')
  @ApiOperation({
    summary: 'Criar e enviar pedido',
    description:
      'Identifica o vendedor pelo JWT, valida itens e reserva estoque atomicamente. O pedido é criado em PENDING.',
  })
  @ApiBody({ type: CreateOrderDto })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
    description:
      'Chave estável por pedido (UUID gerado pelo cliente); até 150 caracteres. Repetição da mesma chave retorna 409 sem criar outro pedido.',
  })
  @ApiCreatedResponse({
    description:
      'Pedido criado com snapshots dos dados e itens, reserva de estoque e histórico inicial.',
    type: OrderResponseDto,
  })
  create(
    @Body() body: CreateOrderDto,
    @Headers('idempotency-key') key: string | undefined,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.createOrder.execute(body, actor.sub, key);
  }

  @Get('my-orders')
  @RequirePermissions('orders.read')
  @ApiOperation({ summary: 'Listar pedidos do vendedor autenticado' })
  @ApiPageQueries()
  @ApiPaged(OrdersPageResponseDto, 'Pedidos criados pelo usuário autenticado.')
  myOrders(
    @Query('page') page: string | undefined,
    @Query('limit') limit: string | undefined,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const paging = pagination(page, limit);
    return this.listOrders.execute(paging.page, paging.limit, actor.sub, false);
  }

  @Get()
  @RequirePermissions('orders.read')
  @ApiOperation({
    summary: 'Listar pedidos autorizados',
    description:
      'Sem orders.read.all, os resultados são limitados ao vendedor autenticado.',
  })
  @ApiPageQueries()
  @ApiQuery({ name: 'status', required: false, enum: OrderStatus })
  @ApiQuery({ name: 'customerId', required: false, format: 'uuid' })
  @ApiQuery({
    name: 'createdByUserId',
    required: false,
    format: 'uuid',
    description: 'Filtro administrativo; não amplia o escopo de leitura.',
  })
  @ApiQuery({ name: 'from', required: false, example: '2026-10-01T00:00:00Z' })
  @ApiQuery({ name: 'to', required: false, example: '2026-10-31T23:59:59Z' })
  @ApiPaged(OrdersPageResponseDto, 'Lista paginada de pedidos com itens.')
  list(
    @Query('page') page: string | undefined,
    @Query('limit') limit: string | undefined,
    @Query('status') status: string | undefined,
    @Query('customerId') customerId: string | undefined,
    @Query('createdByUserId') createdByUserId: string | undefined,
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const paging = pagination(page, limit);
    return this.listOrders.execute(
      paging.page,
      paging.limit,
      actor.sub,
      actor.permissions.includes('orders.read.all'),
      customerId,
      status,
      createdByUserId,
      from,
      to,
    );
  }

  @Get(':id/history')
  @RequirePermissions('orders.read')
  @ApiOperation({ summary: 'Consultar histórico de status do pedido' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiArray(
    OrderStatusHistoryResponseDto,
    'Eventos de criação, processamento, despacho, entrega ou cancelamento em ordem cronológica.',
  )
  history(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.getOrderHistory.execute(
      id,
      actor.sub,
      actor.permissions.includes('orders.read.all'),
    );
  }

  @Get(':id')
  @RequirePermissions('orders.read')
  @ApiOperation({ summary: 'Consultar pedido e itens' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOk(
    OrderResponseDto,
    'Pedido com snapshots do cliente, itens e status atual.',
  )
  get(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.findOrderById.execute(
      id,
      actor.sub,
      actor.permissions.includes('orders.read.all'),
    );
  }

  @Post(':id/cancel')
  @RequirePermissions('orders.cancel')
  @ApiOperation({
    summary: 'Cancelar pedido',
    description:
      'Permitido antes do despacho; a reserva é liberada e o evento fica no histórico.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiBody({ type: OrderTransitionDto })
  @ApiOk(OrderResponseDto, 'Pedido cancelado e reserva liberada.')
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: OrderTransitionDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.cancelOrder.execute(
      id,
      actor.sub,
      actor.permissions.includes('orders.cancel.all'),
      body.notes,
    );
  }
}
