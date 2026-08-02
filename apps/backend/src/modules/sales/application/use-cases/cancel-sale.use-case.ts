import { createHash } from 'node:crypto';

import { SaleIdempotencyKeyConflictError } from '../../domain/errors/sale-idempotency-key-conflict.error';
import { SaleIdempotencyRequestInProgressError } from '../../domain/errors/sale-idempotency-request-in-progress.error';
import { SaleNotCancelableError } from '../../domain/errors/sale-not-cancelable.error';
import { SaleNotFoundError } from '../../domain/errors/sale-not-found.error';
import { SaleCancelReason } from '../../domain/value-objects/sale-cancel-reason';
import type { CancelSalePersistence } from '../ports/cancel-sale-persistence';
import type { PersistedSale } from '../ports/create-sale-persistence';

export interface CancelSaleInput {
  actorId: string;
  saleId: string;
  idempotencyKey: string;
  reason: string;
  requestId?: string;
}

export class CancelSaleUseCase {
  constructor(private readonly persistence: CancelSalePersistence) {}

  async execute(input: CancelSaleInput): Promise<PersistedSale> {
    const normalized = {
      saleId: input.saleId,
      reason: SaleCancelReason.create(input.reason).value,
    };
    const requestHash = createHash('sha256')
      .update(JSON.stringify(normalized))
      .digest('hex');
    const result = await this.persistence.cancelIdempotently({
      actorId: input.actorId,
      saleId: input.saleId,
      idempotencyKey: input.idempotencyKey,
      idempotencyScope: `sales:cancel:user:${input.actorId}`,
      requestHash,
      reason: normalized.reason,
      requestId: input.requestId,
    });

    if (result.status === 'not_found') throw new SaleNotFoundError();
    if (result.status === 'not_cancelable') throw new SaleNotCancelableError();
    if (result.status === 'idempotency_conflict') {
      throw new SaleIdempotencyKeyConflictError();
    }
    if (result.status === 'idempotency_in_progress') {
      throw new SaleIdempotencyRequestInProgressError();
    }
    return result.sale;
  }
}
