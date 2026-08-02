import { createHash } from 'node:crypto';

import { describe, expect, it, vi } from 'vitest';

import type {
  CancelSalePersistence,
  CancelSalePersistenceResult,
} from '../../../src/modules/sales/application/ports/cancel-sale-persistence';
import { CancelSaleUseCase } from '../../../src/modules/sales/application/use-cases/cancel-sale.use-case';
import { InvalidSaleCancelReasonError } from '../../../src/modules/sales/domain/errors/invalid-sale-cancel-reason.error';
import { SaleIdempotencyKeyConflictError } from '../../../src/modules/sales/domain/errors/sale-idempotency-key-conflict.error';
import { SaleIdempotencyRequestInProgressError } from '../../../src/modules/sales/domain/errors/sale-idempotency-request-in-progress.error';
import { SaleNotCancelableError } from '../../../src/modules/sales/domain/errors/sale-not-cancelable.error';
import { SaleNotFoundError } from '../../../src/modules/sales/domain/errors/sale-not-found.error';

const actorId = '55c1e5bb-4795-485b-af90-a8d25d3d94b1';
const saleId = 'abfb53af-ec77-4551-9ab2-2e6caf4f24fb';
const canceledSale = {
  id: saleId,
  customer: null,
  status: 'CANCELED' as const,
  saleDate: '2026-08-02T10:00:00.000Z',
  paymentMethod: 'PIX' as const,
  total: '24.00',
  notes: null,
  canceledAt: '2026-08-02T11:00:00.000Z',
  cancelReason: 'Cliente desistiu da compra',
  items: [],
  createdAt: '2026-08-02T10:00:00.000Z',
  updatedAt: '2026-08-02T11:00:00.000Z',
};

function makeSubject(
  result: CancelSalePersistenceResult = {
    status: 'canceled',
    sale: canceledSale,
  },
) {
  const persistence: CancelSalePersistence = {
    cancelIdempotently: vi.fn().mockResolvedValue(result),
  };
  return { persistence, useCase: new CancelSaleUseCase(persistence) };
}

describe('CancelSaleUseCase', () => {
  it('normalizes and hashes the cancellation before persistence', async () => {
    const subject = makeSubject();

    const result = await subject.useCase.execute({
      actorId,
      saleId,
      idempotencyKey: 'df694e95-39c0-445a-968d-1cb36ac0448f',
      reason: '  Cliente desistiu da compra  ',
      requestId: 'req-cancel-sale',
    });

    const normalized = { saleId, reason: 'Cliente desistiu da compra' };
    expect(subject.persistence.cancelIdempotently).toHaveBeenCalledWith({
      actorId,
      saleId,
      idempotencyKey: 'df694e95-39c0-445a-968d-1cb36ac0448f',
      idempotencyScope: `sales:cancel:user:${actorId}`,
      requestHash: createHash('sha256')
        .update(JSON.stringify(normalized))
        .digest('hex'),
      reason: normalized.reason,
      requestId: 'req-cancel-sale',
    });
    expect(result).toEqual(canceledSale);
  });

  it.each(['', '   ', 'a'.repeat(501)])(
    'rejects invalid reason %j before persistence',
    async (reason) => {
      const subject = makeSubject();
      await expect(
        subject.useCase.execute({
          actorId,
          saleId,
          idempotencyKey: 'df694e95-39c0-445a-968d-1cb36ac0448f',
          reason,
        }),
      ).rejects.toBeInstanceOf(InvalidSaleCancelReasonError);
      expect(subject.persistence.cancelIdempotently).not.toHaveBeenCalled();
    },
  );

  it.each<{
    status: Exclude<CancelSalePersistenceResult['status'], 'canceled' | 'replayed'>;
    error: new () => Error;
  }>([
    { status: 'not_found', error: SaleNotFoundError },
    { status: 'not_cancelable', error: SaleNotCancelableError },
    { status: 'idempotency_conflict', error: SaleIdempotencyKeyConflictError },
    {
      status: 'idempotency_in_progress',
      error: SaleIdempotencyRequestInProgressError,
    },
  ])('maps persistence status $status to its domain error', async ({ status, error }) => {
    const subject = makeSubject({ status });
    await expect(
      subject.useCase.execute({
        actorId,
        saleId,
        idempotencyKey: 'df694e95-39c0-445a-968d-1cb36ac0448f',
        reason: 'Cliente desistiu',
      }),
    ).rejects.toBeInstanceOf(error);
  });
});
