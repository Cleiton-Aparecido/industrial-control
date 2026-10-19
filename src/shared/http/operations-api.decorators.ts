import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiQuery,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger';

export function pagination(page?: string, limit?: string) {
  const parsedPage = Number(page);
  const parsedLimit = Number(limit);
  return {
    page: Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1,
    limit:
      Number.isInteger(parsedLimit) && parsedLimit > 0
        ? Math.min(parsedLimit, 100)
        : 25,
  };
}

export function ApiCommonResponses() {
  return applyDecorators(
    ApiBadRequestResponse({
      description: 'Corpo, parâmetro ou filtro inválido.',
    }),
    ApiUnauthorizedResponse({ description: 'Token JWT ausente ou inválido.' }),
    ApiForbiddenResponse({
      description: 'Permissão insuficiente ou recurso fora do escopo.',
    }),
    ApiNotFoundResponse({ description: 'Recurso não encontrado.' }),
    ApiConflictResponse({
      description: 'Conflito de negócio, duplicidade ou saldo insuficiente.',
    }),
  );
}

export function ApiPageQueries() {
  return applyDecorators(
    ApiQuery({
      name: 'page',
      required: false,
      type: Number,
      example: 1,
      description: 'Página, iniciando em 1.',
    }),
    ApiQuery({
      name: 'limit',
      required: false,
      type: Number,
      example: 25,
      maximum: 100,
      description: 'Itens por página, máximo 100.',
    }),
  );
}

export function ApiOk(model: Type<unknown>, description: string) {
  return applyDecorators(
    ApiExtraModels(model),
    ApiOkResponse({ description, type: model }),
  );
}

export function ApiPaged(model: Type<unknown>, description: string) {
  return applyDecorators(
    ApiExtraModels(model),
    ApiOkResponse({
      description,
      schema: { $ref: getSchemaPath(model) },
    }),
  );
}

export function ApiArray(model: Type<unknown>, description: string) {
  return applyDecorators(
    ApiExtraModels(model),
    ApiOkResponse({ description, type: model, isArray: true }),
  );
}
