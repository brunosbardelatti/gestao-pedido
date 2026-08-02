import {
  ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

import { InvalidCredentialsError } from '../../modules/auth/domain/errors/invalid-credentials.error';
import { AuthenticationRequiredError } from '../../modules/auth/domain/errors/authentication-required.error';
import { CannotResetOwnPasswordError } from '../../modules/auth/domain/errors/cannot-reset-own-password.error';
import { InsufficientRoleError } from '../../modules/auth/domain/errors/insufficient-role.error';
import { UserNotFoundError } from '../../modules/auth/domain/errors/user-not-found.error';
import type { RequestWithId } from '../http/request-with-id';

interface HttpExceptionBody {
  message?: string | string[];
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<RequestWithId>();
    const response = context.getResponse<Response>();

    const error = this.describe(exception);

    if (error.status >= 500) {
      this.logger.error(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          requestId: request.requestId,
          method: request.method,
          route: request.originalUrl,
          error:
            exception instanceof Error ? exception.message : 'Unknown error',
        }),
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(error.status).json({
      error: {
        code: error.code,
        message: error.message,
        requestId: request.requestId,
        ...(error.details ? { details: error.details } : {}),
      },
    });
  }

  private describe(exception: unknown): {
    status: number;
    code: string;
    message: string;
    details?: string[];
  } {
    if (exception instanceof InvalidCredentialsError) {
      return {
        status: HttpStatus.UNAUTHORIZED,
        code: exception.code,
        message: exception.message,
      };
    }

    if (exception instanceof AuthenticationRequiredError) {
      return {
        status: HttpStatus.UNAUTHORIZED,
        code: exception.code,
        message: exception.message,
      };
    }

    if (exception instanceof InsufficientRoleError) {
      return {
        status: HttpStatus.FORBIDDEN,
        code: exception.code,
        message: exception.message,
      };
    }

    if (exception instanceof UserNotFoundError) {
      return {
        status: HttpStatus.NOT_FOUND,
        code: exception.code,
        message: exception.message,
      };
    }

    if (exception instanceof CannotResetOwnPasswordError) {
      return {
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        code: exception.code,
        message: exception.message,
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      const body =
        typeof exceptionResponse === 'object'
          ? (exceptionResponse as HttpExceptionBody)
          : undefined;
      const details = Array.isArray(body?.message) ? body.message : undefined;

      return {
        status,
        code: this.httpCode(status),
        message: this.httpMessage(status),
        ...(details ? { details } : {}),
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_ERROR',
      message: 'Erro interno do servidor.',
    };
  }

  private httpCode(status: number): string {
    const codes: Partial<Record<number, string>> = {
      [HttpStatus.BAD_REQUEST]: 'VALIDATION_ERROR',
      [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
      [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
      [HttpStatus.NOT_FOUND]: 'RESOURCE_NOT_FOUND',
      [HttpStatus.CONFLICT]: 'CONFLICT',
      [HttpStatus.UNPROCESSABLE_ENTITY]: 'BUSINESS_RULE_VIOLATION',
    };

    return codes[status] ?? 'HTTP_ERROR';
  }

  private httpMessage(status: number): string {
    const messages: Partial<Record<number, string>> = {
      [HttpStatus.BAD_REQUEST]: 'Dados de entrada inválidos.',
      [HttpStatus.UNAUTHORIZED]: 'Autenticação necessária.',
      [HttpStatus.FORBIDDEN]: 'Acesso negado.',
      [HttpStatus.NOT_FOUND]: 'Recurso não encontrado.',
      [HttpStatus.CONFLICT]: 'Conflito ao processar a solicitação.',
      [HttpStatus.UNPROCESSABLE_ENTITY]: 'Regra de negócio violada.',
    };

    return messages[status] ?? 'Falha ao processar a solicitação.';
  }
}
