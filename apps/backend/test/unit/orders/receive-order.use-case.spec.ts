import { describe, expect, it, vi } from 'vitest';

import type {
  ReceiveOrderPersistence,
  ReceiveOrderPersistenceResult,
} from '../../../src/modules/orders/application/ports/receive-order-persistence';
import { ReceiveOrderUseCase } from '../../../src/modules/orders/application/use-cases/receive-order.use-case';
import { DuplicateReceiptItemError } from '../../../src/modules/orders/domain/errors/duplicate-receipt-item.error';
import { IdempotencyKeyConflictError } from '../../../src/modules/orders/domain/errors/idempotency-key-conflict.error';
import { IdempotencyRequestInProgressError } from '../../../src/modules/orders/domain/errors/idempotency-request-in-progress.error';
import { InvalidExpirationDateError } from '../../../src/modules/orders/domain/errors/invalid-expiration-date.error';
import { InvalidOrderNotesError } from '../../../src/modules/orders/domain/errors/invalid-order-notes.error';
import { InvalidReceiptItemError } from '../../../src/modules/orders/domain/errors/invalid-receipt-item.error';
import { OrderNotFoundError } from '../../../src/modules/orders/domain/errors/order-not-found.error';
import { OrderNotReceivableError } from '../../../src/modules/orders/domain/errors/order-not-receivable.error';
import { OrderReceiptItemsMismatchError } from '../../../src/modules/orders/domain/errors/order-receipt-items-mismatch.error';
import { ReceivedQuantityExceededError } from '../../../src/modules/orders/domain/errors/received-quantity-exceeded.error';

const actorId = '55c1e5bb-4795-485b-af90-a8d25d3d94b1';
const orderId = 'abfb53af-ec77-4551-9ab2-2e6caf4f24fb';
const firstItemId = '47c9f5c4-24a5-463c-ab91-3fc6e0b83fe8';
const secondItemId = '28828ed0-e78d-41ad-a648-727ebee00da1';
const idempotencyKey = '358708d9-4b14-438a-b7c4-5a8bc9859098';

const receivedOrder = {
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
  receivedAt: '2026-08-04T10:00:00.000Z',
  canceledAt: null,
  cancelReason: null,
  status: 'RECEIVED' as const,
  notes: null,
  items: [],
  createdAt: '2026-08-02T10:00:00.000Z',
  updatedAt: '2026-08-04T10:00:00.000Z',
};

const validInput = {
  actorId,
  orderId,
  idempotencyKey,
  items: [
    {
      orderItemId: firstItemId,
      quantityReceived: 2,
      expirationDate: '2027-12-31',
      notes: 'Caixa íntegra',
    },
    {
      orderItemId: secondItemId,
      quantityReceived: 0,
      expirationDate: null,
      notes: null,
    },
  ],
};

function makeSubject(
  result: ReceiveOrderPersistenceResult = {
    status: 'received',
    order: receivedOrder,
  },
) {
  const persistence: ReceiveOrderPersistence = {
    receiveIdempotently: vi.fn().mockResolvedValue(result),
  };

  return {
    persistence,
    useCase: new ReceiveOrderUseCase(persistence),
  };
}

describe('ReceiveOrderUseCase', () => {
  it('normalizes receipt items and creates an actor-scoped request hash', async () => {
    const subject = makeSubject();

    const result = await subject.useCase.execute({
      ...validInput,
      requestId: 'req-receive-order',
      items: [
        {
          ...validInput.items[0],
          notes: '  Caixa íntegra  ',
        },
        validInput.items[1],
      ],
    });

    expect(subject.persistence.receiveIdempotently).toHaveBeenCalledWith({
      actorId,
      orderId,
      idempotencyKey,
      idempotencyScope: `orders:receive:user:${actorId}`,
      requestHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      items: [
        {
          orderItemId: firstItemId,
          quantityReceived: 2,
          expirationDate: '2027-12-31',
          notes: 'Caixa íntegra',
        },
        {
          orderItemId: secondItemId,
          quantityReceived: 0,
          expirationDate: null,
          notes: null,
        },
      ],
      requestId: 'req-receive-order',
    });
    expect(result).toEqual(receivedOrder);
  });

  it.each<{
    status: Exclude<ReceiveOrderPersistenceResult['status'], 'received' | 'replayed'>;
    error: new () => Error;
  }>([
    { status: 'not_found', error: OrderNotFoundError },
    { status: 'not_receivable', error: OrderNotReceivableError },
    { status: 'items_mismatch', error: OrderReceiptItemsMismatchError },
    { status: 'quantity_exceeded', error: ReceivedQuantityExceededError },
    { status: 'idempotency_conflict', error: IdempotencyKeyConflictError },
    {
      status: 'idempotency_in_progress',
      error: IdempotencyRequestInProgressError,
    },
  ])('maps persistence status $status to its domain error', async ({ status, error }) => {
    const subject = makeSubject({ status });

    await expect(subject.useCase.execute(validInput)).rejects.toBeInstanceOf(
      error,
    );
  });

  it('returns a replayed result as a successful receipt', async () => {
    const subject = makeSubject({ status: 'replayed', order: receivedOrder });

    await expect(subject.useCase.execute(validInput)).resolves.toEqual(
      receivedOrder,
    );
  });

  it.each([
    { items: [] },
    { items: [{ ...validInput.items[0], quantityReceived: -1 }] },
    { items: [{ ...validInput.items[0], quantityReceived: 1.5 }] },
  ])('rejects invalid receipt items before persistence: %j', async (invalid) => {
    const subject = makeSubject();

    await expect(
      subject.useCase.execute({ ...validInput, ...invalid }),
    ).rejects.toBeInstanceOf(InvalidReceiptItemError);
    expect(subject.persistence.receiveIdempotently).not.toHaveBeenCalled();
  });

  it('rejects duplicate order item identifiers before persistence', async () => {
    const subject = makeSubject();

    await expect(
      subject.useCase.execute({
        ...validInput,
        items: [validInput.items[0], { ...validInput.items[1], orderItemId: firstItemId }],
      }),
    ).rejects.toBeInstanceOf(DuplicateReceiptItemError);
    expect(subject.persistence.receiveIdempotently).not.toHaveBeenCalled();
  });

  it.each(['31/12/2027', '2027-02-30', '']) (
    'rejects invalid expiration date %j before persistence',
    async (expirationDate) => {
      const subject = makeSubject();

      await expect(
        subject.useCase.execute({
          ...validInput,
          items: [{ ...validInput.items[0], expirationDate }],
        }),
      ).rejects.toBeInstanceOf(InvalidExpirationDateError);
      expect(subject.persistence.receiveIdempotently).not.toHaveBeenCalled();
    },
  );

  it('rejects notes longer than 500 characters before persistence', async () => {
    const subject = makeSubject();

    await expect(
      subject.useCase.execute({
        ...validInput,
        items: [{ ...validInput.items[0], notes: 'a'.repeat(501) }],
      }),
    ).rejects.toBeInstanceOf(InvalidOrderNotesError);
    expect(subject.persistence.receiveIdempotently).not.toHaveBeenCalled();
  });
});
