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
import { BrandAlreadyExistsError } from '../../modules/brands/domain/errors/brand-already-exists.error';
import { BrandNotFoundError } from '../../modules/brands/domain/errors/brand-not-found.error';
import { InvalidBrandNameError } from '../../modules/brands/domain/errors/invalid-brand-name.error';
import { CategoryAlreadyExistsError } from '../../modules/categories/domain/errors/category-already-exists.error';
import { CategoryNotFoundError } from '../../modules/categories/domain/errors/category-not-found.error';
import { InvalidCategoryNameError } from '../../modules/categories/domain/errors/invalid-category-name.error';
import { DuplicateOrderProductError } from '../../modules/orders/domain/errors/duplicate-order-product.error';
import { DuplicateReceiptItemError } from '../../modules/orders/domain/errors/duplicate-receipt-item.error';
import { IdempotencyKeyConflictError } from '../../modules/orders/domain/errors/idempotency-key-conflict.error';
import { IdempotencyRequestInProgressError } from '../../modules/orders/domain/errors/idempotency-request-in-progress.error';
import { InvalidExpirationDateError } from '../../modules/orders/domain/errors/invalid-expiration-date.error';
import { InvalidOrderCycleError } from '../../modules/orders/domain/errors/invalid-order-cycle.error';
import { InvalidOrderDateError } from '../../modules/orders/domain/errors/invalid-order-date.error';
import { InvalidOrderItemError } from '../../modules/orders/domain/errors/invalid-order-item.error';
import { InvalidOrderNotesError } from '../../modules/orders/domain/errors/invalid-order-notes.error';
import { InvalidReceiptItemError } from '../../modules/orders/domain/errors/invalid-receipt-item.error';
import { OrderBrandInactiveError } from '../../modules/orders/domain/errors/order-brand-inactive.error';
import { OrderBrandMismatchError } from '../../modules/orders/domain/errors/order-brand-mismatch.error';
import { OrderNotEditableError } from '../../modules/orders/domain/errors/order-not-editable.error';
import { OrderNotFoundError } from '../../modules/orders/domain/errors/order-not-found.error';
import { OrderNotReceivableError } from '../../modules/orders/domain/errors/order-not-receivable.error';
import { OrderProductInactiveError } from '../../modules/orders/domain/errors/order-product-inactive.error';
import { OrderReceiptItemsMismatchError } from '../../modules/orders/domain/errors/order-receipt-items-mismatch.error';
import { ReceivedQuantityExceededError } from '../../modules/orders/domain/errors/received-quantity-exceeded.error';
import { InactiveProductBrandError } from '../../modules/products/domain/errors/inactive-product-brand.error';
import { InactiveProductCategoryError } from '../../modules/products/domain/errors/inactive-product-category.error';
import { InvalidProductCodeError } from '../../modules/products/domain/errors/invalid-product-code.error';
import { InvalidProductDescriptionError } from '../../modules/products/domain/errors/invalid-product-description.error';
import { InvalidProductPriceError } from '../../modules/products/domain/errors/invalid-product-price.error';
import { ProductAlreadyExistsError } from '../../modules/products/domain/errors/product-already-exists.error';
import { ProductNotFoundError } from '../../modules/products/domain/errors/product-not-found.error';
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

    if (exception instanceof BrandAlreadyExistsError) {
      return {
        status: HttpStatus.CONFLICT,
        code: exception.code,
        message: exception.message,
      };
    }

    if (exception instanceof BrandNotFoundError) {
      return {
        status: HttpStatus.NOT_FOUND,
        code: exception.code,
        message: exception.message,
      };
    }

    if (exception instanceof InvalidBrandNameError) {
      return {
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        code: exception.code,
        message: exception.message,
      };
    }

    if (exception instanceof CategoryAlreadyExistsError) {
      return {
        status: HttpStatus.CONFLICT,
        code: exception.code,
        message: exception.message,
      };
    }

    if (exception instanceof CategoryNotFoundError) {
      return {
        status: HttpStatus.NOT_FOUND,
        code: exception.code,
        message: exception.message,
      };
    }

    if (exception instanceof InvalidCategoryNameError) {
      return {
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        code: exception.code,
        message: exception.message,
      };
    }

    if (exception instanceof ProductAlreadyExistsError) {
      return {
        status: HttpStatus.CONFLICT,
        code: exception.code,
        message: exception.message,
      };
    }

    if (exception instanceof ProductNotFoundError) {
      return {
        status: HttpStatus.NOT_FOUND,
        code: exception.code,
        message: exception.message,
      };
    }

    if (
      exception instanceof InactiveProductBrandError ||
      exception instanceof InactiveProductCategoryError ||
      exception instanceof InvalidProductCodeError ||
      exception instanceof InvalidProductDescriptionError ||
      exception instanceof InvalidProductPriceError
    ) {
      return {
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        code: exception.code,
        message: exception.message,
      };
    }

    if (exception instanceof OrderNotFoundError) {
      return {
        status: HttpStatus.NOT_FOUND,
        code: exception.code,
        message: exception.message,
      };
    }

    if (
      exception instanceof IdempotencyKeyConflictError ||
      exception instanceof IdempotencyRequestInProgressError
    ) {
      return {
        status: HttpStatus.CONFLICT,
        code: exception.code,
        message: exception.message,
      };
    }

    if (
      exception instanceof DuplicateOrderProductError ||
      exception instanceof DuplicateReceiptItemError ||
      exception instanceof InvalidExpirationDateError ||
      exception instanceof InvalidOrderCycleError ||
      exception instanceof InvalidOrderDateError ||
      exception instanceof InvalidOrderItemError ||
      exception instanceof InvalidOrderNotesError ||
      exception instanceof InvalidReceiptItemError ||
      exception instanceof OrderBrandInactiveError ||
      exception instanceof OrderBrandMismatchError ||
      exception instanceof OrderNotEditableError ||
      exception instanceof OrderNotReceivableError ||
      exception instanceof OrderProductInactiveError ||
      exception instanceof OrderReceiptItemsMismatchError ||
      exception instanceof ReceivedQuantityExceededError
    ) {
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
