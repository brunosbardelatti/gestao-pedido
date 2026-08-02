import { randomUUID } from 'node:crypto';

import { Logger, type INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import type { NextFunction, Response } from 'express';

import { ApiExceptionFilter } from './common/errors/api-exception.filter';
import type { RequestWithId } from './common/http/request-with-id';

export function configureApp(app: INestApplication): void {
  const logger = new Logger('HTTP');

  app.setGlobalPrefix('api/v1');
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  });
  app.use(cookieParser());
  app.use(
    (request: RequestWithId, response: Response, next: NextFunction): void => {
      const startedAt = Date.now();
      const incomingRequestId = request.get('x-request-id')?.trim();
      request.requestId =
        incomingRequestId && incomingRequestId.length <= 100
          ? incomingRequestId
          : randomUUID();
      response.setHeader('x-request-id', request.requestId);

      response.on('finish', () => {
        if (process.env.NODE_ENV !== 'test') {
          logger.log(
            JSON.stringify({
              timestamp: new Date().toISOString(),
              requestId: request.requestId,
              method: request.method,
              route: request.originalUrl,
              status: response.statusCode,
              durationMs: Date.now() - startedAt,
            }),
          );
        }
      });
      next();
    },
  );
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new ApiExceptionFilter());
}
