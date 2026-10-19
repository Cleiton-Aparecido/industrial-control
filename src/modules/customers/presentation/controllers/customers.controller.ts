import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
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
  CreateCustomerDto,
  CustomerDocumentLookupResponseDto,
  CustomerResponseDto,
  CustomersPageResponseDto,
  UpdateCustomerDto,
} from '../../application/dto/customer.dto';
import { OrdersPageResponseDto } from 'src/modules/orders/application/dto/order.dto';
import { CreateCustomerUseCase } from '../../application/use-cases/create-customer.use-case';
import { FindCustomerByDocumentUseCase } from '../../application/use-cases/find-customer-by-document.use-case';
import { FindCustomerByIdUseCase } from '../../application/use-cases/find-customer-by-id.use-case';
import { ListCustomersUseCase } from '../../application/use-cases/list-customers.use-case';
import { SetCustomerActiveUseCase } from '../../application/use-cases/set-customer-active.use-case';
import { UpdateCustomerUseCase } from '../../application/use-cases/update-customer.use-case';
import { ListCustomerOrdersUseCase } from 'src/modules/orders/application/use-cases/list-customer-orders.use-case';
import {
  ApiCommonResponses,
  ApiOk,
  ApiPageQueries,
  ApiPaged,
  pagination,
} from 'src/shared/http/operations-api.decorators';

@ApiTags('Customers')
@ApiBearerAuth('access-token')
@ApiCommonResponses()
@Controller('customers')
export class CustomersController {
  constructor(
    private readonly createCustomer: CreateCustomerUseCase,
    private readonly findCustomerByDocument: FindCustomerByDocumentUseCase,
    private readonly listCustomers: ListCustomersUseCase,
    private readonly findCustomerById: FindCustomerByIdUseCase,
    private readonly updateCustomer: UpdateCustomerUseCase,
    private readonly setCustomerActive: SetCustomerActiveUseCase,
    private readonly listCustomerOrders: ListCustomerOrdersUseCase,
  ) {}

  @Post()
  @RequirePermissions('customers.create')
  @ApiOperation({
    summary: 'Cadastrar cliente',
    description:
      'Normaliza e valida CPF/CNPJ. Documento duplicado retorna conflito de unicidade.',
  })
  @ApiBody({ type: CreateCustomerDto })
  @ApiCreatedResponse({
    description: 'Cliente criado.',
    type: CustomerResponseDto,
  })
  create(
    @Body() body: CreateCustomerDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.createCustomer.execute(body, actor.sub);
  }

  @Get()
  @RequirePermissions('customers.read')
  @ApiOperation({
    summary: 'Listar clientes',
    description: 'Busca por nome, documento, e-mail ou telefone.',
  })
  @ApiPageQueries()
  @ApiQuery({ name: 'search', required: false, example: 'Maria' })
  @ApiPaged(CustomersPageResponseDto, 'Lista paginada de clientes.')
  list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    const paging = pagination(page, limit);
    return this.listCustomers.execute(paging.page, paging.limit, search);
  }

  @Get('by-document/:document')
  @RequirePermissions('customers.read')
  @ApiOperation({
    summary: 'Buscar cliente pelo documento',
    description:
      'Prefira a variante de query para documentos formatados que contenham barra.',
  })
  @ApiParam({
    name: 'document',
    example: '52998224725',
    description: 'CPF/CNPJ com ou sem pontuação.',
  })
  @ApiOk(
    CustomerDocumentLookupResponseDto,
    'Objeto found/customer; customer será null quando não houver cadastro.',
  )
  byDocument(@Param('document') document: string) {
    return this.findCustomerByDocument.execute(document);
  }

  @Get('by-document')
  @RequirePermissions('customers.read')
  @ApiOperation({ summary: 'Buscar cliente por CPF/CNPJ formatado' })
  @ApiQuery({ name: 'document', required: true, example: '11.222.333/0001-81' })
  @ApiOk(
    CustomerDocumentLookupResponseDto,
    'Objeto found/customer; customer será null quando não houver cadastro.',
  )
  byDocumentQuery(@Query('document') document: string) {
    return this.findCustomerByDocument.execute(document);
  }

  @Get(':id/orders')
  @RequirePermissions('orders.read')
  @ApiOperation({
    summary: 'Listar pedidos do cliente',
    description:
      'Respeita o escopo do usuário; vendedores veem somente os próprios pedidos.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiPageQueries()
  @ApiPaged(
    OrdersPageResponseDto,
    'Lista paginada dos pedidos autorizados para o cliente.',
  )
  orders(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @CurrentUser() actor?: AuthenticatedUser,
  ) {
    const paging = pagination(page, limit);
    return this.listCustomerOrders.execute(
      id,
      actor!.sub,
      actor!.permissions.includes('orders.read.all'),
      paging.page,
      paging.limit,
    );
  }

  @Get(':id')
  @RequirePermissions('customers.read')
  @ApiOperation({ summary: 'Consultar cliente por ID' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOk(CustomerResponseDto, 'Cliente encontrado.')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.findCustomerById.execute(id);
  }

  @Patch(':id')
  @RequirePermissions('customers.update')
  @ApiOperation({
    summary: 'Atualizar cadastro do cliente',
    description: 'Documento fiscal é imutável após o cadastro.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiBody({ type: UpdateCustomerDto })
  @ApiOk(CustomerResponseDto, 'Cadastro atualizado.')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateCustomerDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.updateCustomer.execute(id, body, actor.sub);
  }

  @Patch(':id/activate')
  @RequirePermissions('customers.update')
  @ApiOperation({ summary: 'Ativar cliente' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOk(CustomerResponseDto, 'Cliente ativado.')
  activate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.setCustomerActive.execute(id, true, actor.sub);
  }

  @Patch(':id/deactivate')
  @RequirePermissions('customers.deactivate')
  @ApiOperation({ summary: 'Desativar cliente' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOk(CustomerResponseDto, 'Cliente desativado.')
  deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.setCustomerActive.execute(id, false, actor.sub);
  }
}
