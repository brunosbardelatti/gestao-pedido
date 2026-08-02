import { describe, expect, it, vi } from 'vitest';

import type {
  CancelOrderPersistence,
  CancelOrderPersistenceResult,
} from '../../../src/modules/orders/application/ports/cancel-order-persistence';
import { CancelOrderUseCase } from '../../../src/modules/orders/application/use-cases/cancel-order.use-case';
import { InvalidOrderCancelReasonError } from '../../../src/modules/orders/domain/errors/invalid-order-cancel-reason.error';
import { OrderNotCancelableError } from '../../../src/modules/orders/domain/errors/order-not-cancelable.error';
import { OrderNotFoundError } from '../../../src/modules/orders/domain/errors/order-not-found.error';

const actorId = '55c1e5bb-4795-485b-af90-a8d25d3d94b1';
const orderId = 'abfb53af-ec77-4551-9ab2-2e6caf4f24fb';
const canceledOrder = {
  id: orderId,
  brand: {
    id: '26bf7359-befe-4eb9-bcc9-58fc72489be0',
    name: 'Natura',
    active: true,
    createdAt: '2026-08-02T10:00:00.000Z',
    updatedAt: '2026-08-02T10:00:00.000Z',
  },
  cycle: '12/2026',
  orderDate: '2026-08-02',
  receivedAt: null,
  canceledAt: '2026-08-04T10:00:00.000Z',
  cancelReason: 'Fornecedor cancelou a campanha',
  status: 'CANCELED' as const,
  notes: null,
  items: [],
  createdAt: '2026-08-02T10:00:00.000Z',
  updatedAt: '2026-08-04T10:00:00.000Z',
};

function makeSubject(
  result: CancelOrderPersistenceResult = {
    status: 'canceled',
    order: canceledOrder,
  },
) {
  const persistence: CancelOrderPersistence = {
    cancelWithAudit: vi.fn().mockResolvedValue(result),
  };

  return {
    persistence,
    useCase: new CancelOrderUseCase(persistence),
  };
}

describe('CancelOrderUseCase', () => {
  it('normalizes the reason before canceling with audit', async () => {
    const subject = makeSubject();

    const result = await subject.useCase.execute({
      actorId,
      orderId,
      reason: '  Fornecedor cancelou a campanha  ',
      requestId: 'req-cancel-order',
    });

    expect(subject.persistence.cancelWithAudit).toHaveBeenCalledWith({
      actorId,
      orderId,
      reason: 'Fornecedor cancelou a campanha',
      requestId: 'req-cancel-order',
    });
    expect(result).toEqual(canceledOrder);
  });

  it.each<{
    status: Exclude<CancelOrderPersistenceResult['status'], 'canceled'>;
    error: new () => Error;
  }>([
    { status: 'not_found', error: OrderNotFoundError },
    { status: 'not_cancelable', error: OrderNotCancelableError },
  ])('maps persistence status $status to its domain error', async ({ status, error }) => {
    const subject = makeSubject({ status });

    await expect(
      subject.useCase.execute({ actorId, orderId, reason: 'Cancelamento' }),
    ).rejects.toBeInstanceOf(error);
  });

  it.each(['', '   ', 'a'.repeat(501)])(
    'rejects invalid reason %j before persistence',
    async (reason) => {
      const subject = makeSubject();

      await expect(
        subject.useCase.execute({ actorId, orderId, reason }),
      ).rejects.toBeInstanceOf(InvalidOrderCancelReasonError);
      expect(subject.persistence.cancelWithAudit).not.toHaveBeenCalled();
    },
  );
});
