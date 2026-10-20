import {
  CreateProductDto,
  ProductResponseDto,
  ProductsPageResponseDto,
  UpdateProductDto,
} from '../../application/dto/product.dto';
import {
  StockBalanceResponseDto,
  StockMovementsPageResponseDto,
} from 'src/modules/stock/application/dto/stock.dto';
import {
  ApiCommonResponses,
  ApiOk,
  ApiPageQueries,
  ApiPaged,
  pagination,
} from 'src/shared/http/operations-api.decorators';
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
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from 'src/infra/auth/decorator/current-user.decorator';
import { Public, RequirePermissions } from 'src/infra/auth/auth-metadata';
import type { AuthenticatedUser } from 'src/infra/auth/service/auth.service';
import { CreateProductUseCase } from '../../application/use-cases/create-product.use-case';
import { FindProductByIdUseCase } from '../../application/use-cases/find-product-by-id.use-case';
import { ListProductsUseCase } from '../../application/use-cases/list-products.use-case';
import { ListPublicProductsUseCase } from 'src/modules/products/application/use-cases/list-public-products.use-case';
import { SetProductActiveUseCase } from '../../application/use-cases/set-product-active.use-case';
import { UpdateProductUseCase } from '../../application/use-cases/update-product.use-case';
import { GetProductStockBalanceUseCase } from 'src/modules/stock/application/use-cases/get-product-stock-balance.use-case';
import { ListStockMovementsUseCase } from 'src/modules/stock/application/use-cases/list-stock-movements.use-case';

@ApiTags('Products')
@ApiBearerAuth('access-token')
@ApiCommonResponses()
@Controller('products')
export class ProductsController {
  constructor(
    private readonly createProduct: CreateProductUseCase,
    private readonly listProducts: ListProductsUseCase,
    private readonly listPublicProducts: ListPublicProductsUseCase,
    private readonly findProductById: FindProductByIdUseCase,
    private readonly updateProduct: UpdateProductUseCase,
    private readonly setProductActive: SetProductActiveUseCase,
    private readonly getProductStockBalance: GetProductStockBalanceUseCase,
    private readonly listStockMovements: ListStockMovementsUseCase,
  ) {}

  @Post()
  @RequirePermissions('products.create')
  @ApiOperation({
    summary: 'Cadastrar produto',
    description:
      'Cria o cadastro e inicializa saldo físico e reservado em zero. O saldo não pode ser informado neste endpoint.',
  })
  @ApiBody({ type: CreateProductDto })
  @ApiCreatedResponse({
    description: 'Produto criado.',
    type: ProductResponseDto,
  })
  create(
    @Body() body: CreateProductDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.createProduct.execute(body, actor.sub);
  }

  @Get()
  @RequirePermissions('products.read')
  @ApiOperation({
    summary: 'Listar produtos',
    description: 'Busca por nome ou SKU e retorna paginação.',
  })
  @ApiPageQueries()
  @ApiPaged(ProductsPageResponseDto, 'Lista paginada de produtos.')
  list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    const paging = pagination(page, limit);
    return this.listProducts.execute(paging.page, paging.limit, search);
  }

  @Get('public')
  @Public()
  @ApiOperation({
    summary: 'Listar produtos ativos publicamente',
    description: 'Retorna produtos ativos paginados sem exigir autenticação.',
    security: [],
  })
  @ApiPageQueries()
  @ApiPaged(ProductsPageResponseDto, 'Lista paginada de produtos ativos.')
  listPublic(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    const paging = pagination(page, limit);
    return this.listPublicProducts.execute(paging.page, paging.limit, search);
  }

  @Get(':id/stock')
  @RequirePermissions('products.stock.read')
  @ApiOperation({
    summary: 'Consultar saldo do produto',
    description: 'Retorna quantidade física e reservada.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOk(StockBalanceResponseDto, 'Saldo atual do produto.')
  stock(@Param('id', ParseUUIDPipe) id: string) {
    return this.getProductStockBalance.execute(id);
  }

  @Get(':id/stock-movements')
  @RequirePermissions('stock.movements.read')
  @ApiOperation({ summary: 'Consultar movimentações do produto' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiPageQueries()
  @ApiPaged(
    StockMovementsPageResponseDto,
    'Histórico paginado de movimentações do produto.',
  )
  movements(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const paging = pagination(page, limit);
    return this.listStockMovements.execute(
      { productId: id },
      paging.page,
      paging.limit,
    );
  }

  @Get(':id')
  @RequirePermissions('products.read')
  @ApiOperation({ summary: 'Consultar produto por ID' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOk(ProductResponseDto, 'Produto encontrado.')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.findProductById.execute(id);
  }

  @Patch(':id')
  @RequirePermissions('products.update')
  @ApiOperation({
    summary: 'Atualizar cadastro do produto',
    description:
      'Atualiza somente dados cadastrais; não altera saldo nem histórico.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiBody({ type: UpdateProductDto })
  @ApiOk(ProductResponseDto, 'Cadastro atualizado.')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateProductDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.updateProduct.execute(id, body, actor.sub);
  }

  @Patch(':id/activate')
  @RequirePermissions('products.update')
  @ApiOperation({ summary: 'Ativar produto' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOk(ProductResponseDto, 'Produto ativado.')
  activate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.setProductActive.execute(id, true, actor.sub);
  }

  @Patch(':id/deactivate')
  @RequirePermissions('products.deactivate')
  @ApiOperation({
    summary: 'Desativar produto',
    description: 'Produtos inativos não podem ser incluídos em novos pedidos.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOk(ProductResponseDto, 'Produto desativado.')
  deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.setProductActive.execute(id, false, actor.sub);
  }
}
