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
  ApiOkResponse,
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
  OrderResponseDto,
  OrdersPageResponseDto,
  OrderTransitionDto,
} from 'src/modules/orders/application/dto/order.dto';
import { ConfirmOrderDeliveryUseCase } from '../../application/use-cases/confirm-order-delivery.use-case';
import { DispatchOrderUseCase } from '../../application/use-cases/dispatch-order.use-case';
import { ReadyOrderForShipmentUseCase } from '../../application/use-cases/ready-order-for-shipment.use-case';
import { StartOrderProcessingUseCase } from '../../application/use-cases/start-order-processing.use-case';
import { FindOrderByIdUseCase } from 'src/modules/orders/application/use-cases/find-order-by-id.use-case';
import { ListOrdersUseCase } from 'src/modules/orders/application/use-cases/list-orders.use-case';
import {
  ApiCommonResponses,
  ApiOk,
  ApiPageQueries,
  ApiPaged,
  pagination,
} from 'src/shared/http/operations-api.decorators';

@ApiTags('Logistics')
@ApiBearerAuth('access-token')
@ApiCommonResponses()
@Controller('logistics/orders')
export class LogisticsController {
  constructor(
    private readonly listOrders: ListOrdersUseCase,
    private readonly findOrderById: FindOrderByIdUseCase,
    private readonly startOrderProcessing: StartOrderProcessingUseCase,
    private readonly readyOrderForShipment: ReadyOrderForShipmentUseCase,
    private readonly dispatchOrder: DispatchOrderUseCase,
    private readonly confirmOrderDelivery: ConfirmOrderDeliveryUseCase,
  ) {}

  @Get()
  @RequirePermissions('logistics.orders.read')
  @ApiOperation({
    summary: 'Listar fila logística',
    description: 'Filtra pedidos por status, período, cliente ou vendedor.',
  })
  @ApiPageQueries()
  @ApiQuery({ name: 'status', required: false, enum: OrderStatus })
  @ApiQuery({ name: 'from', required: false, example: '2026-10-01T00:00:00Z' })
  @ApiQuery({ name: 'to', required: false, example: '2026-10-31T23:59:59Z' })
  @ApiQuery({ name: 'customerId', required: false, format: 'uuid' })
  @ApiQuery({ name: 'createdByUserId', required: false, format: 'uuid' })
  @ApiPaged(
    OrdersPageResponseDto,
    'Pedidos logísticos paginados com seus itens.',
  )
  list(
    @Query('page') page: string | undefined,
    @Query('limit') limit: string | undefined,
    @Query('status') status: string | undefined,
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @Query('customerId') customerId: string | undefined,
    @Query('createdByUserId') createdByUserId: string | undefined,
  ) {
    const paging = pagination(page, limit);
    return this.listOrders.execute(
      paging.page,
      paging.limit,
      undefined,
      true,
      customerId,
      status,
      createdByUserId,
      from,
      to,
    );
  }

  @Get(':id')
  @RequirePermissions('logistics.orders.read')
  @ApiOperation({ summary: 'Consultar detalhes logísticos do pedido' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOk(
    OrderResponseDto,
    'Pedido, itens, snapshots e dados do processamento logístico.',
  )
  get(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.findOrderById.execute(id, actor.sub, true);
  }

  @Post(':id/start-processing')
  @RequirePermissions('logistics.orders.process')
  @ApiOperation({
    summary: 'Assumir pedido',
    description:
      'Transição PENDING → PROCESSING; o usuário autenticado torna-se o responsável.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiBody({ type: OrderTransitionDto })
  @ApiOkResponse({
    description: 'Pedido atribuído ao usuário e iniciado.',
    type: OrderResponseDto,
  })
  start(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: OrderTransitionDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.startOrderProcessing.execute(id, actor.sub, body.notes);
  }

  @Post(':id/ready-for-shipment')
  @RequirePermissions('logistics.orders.prepare-shipment')
  @ApiOperation({
    summary: 'Marcar pedido pronto para expedição',
    description:
      'Transição PROCESSING → READY_FOR_SHIPMENT, somente pelo responsável atribuído.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiBody({ type: OrderTransitionDto })
  @ApiOkResponse({
    description: 'Pedido pronto para expedição.',
    type: OrderResponseDto,
  })
  ready(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: OrderTransitionDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.readyOrderForShipment.execute(id, actor.sub, body.notes);
  }

  @Post(':id/dispatch')
  @RequirePermissions('logistics.orders.dispatch')
  @ApiOperation({
    summary: 'Despachar pedido',
    description:
      'Transição READY_FOR_SHIPMENT → IN_TRANSIT; baixa o físico e consome a reserva uma única vez.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiBody({ type: OrderTransitionDto })
  @ApiOkResponse({
    description: 'Pedido despachado e movimentações físicas registradas.',
    type: OrderResponseDto,
  })
  dispatch(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: OrderTransitionDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.dispatchOrder.execute(id, actor.sub, body.notes);
  }

  @Post(':id/confirm-delivery')
  @RequirePermissions('logistics.orders.confirm-delivery')
  @ApiOperation({
    summary: 'Confirmar entrega',
    description:
      'Transição IN_TRANSIT → DELIVERED; não realiza nova baixa de estoque.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiBody({ type: OrderTransitionDto })
  @ApiOkResponse({
    description: 'Entrega confirmada e registrada no histórico.',
    type: OrderResponseDto,
  })
  deliver(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: OrderTransitionDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.confirmOrderDelivery.execute(id, actor.sub, body.notes);
  }
}
