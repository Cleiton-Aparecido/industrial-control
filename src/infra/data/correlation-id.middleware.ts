import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import {
  CORRELATION_ID_HEADER,
  resolveCorrelationId,
  runWithCorrelationId,
} from './correlation-id';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const correlationId = resolveCorrelationId(
      req.headers[CORRELATION_ID_HEADER],
    );
    req.headers[CORRELATION_ID_HEADER] = correlationId;
    // Definido antes do processamento: respostas de erro também carregam o cabeçalho.
    res.setHeader(CORRELATION_ID_HEADER, correlationId);
    runWithCorrelationId(correlationId, () => next());
  }
}
