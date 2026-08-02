import { describe, expect, it, vi } from 'vitest';

import { BrandNotFoundError } from '../../../src/modules/brands/domain/errors/brand-not-found.error';
import type {
  CreateOrderPersistence,
  CreateOrderPersistenceResult,
} from '../../../src/modules/orders/application/ports/create-order-persistence';
import { CreateOrderUseCase } from '../../../src/modules/orders/application/use-cases/create-order.use-case';
import { DuplicateOrderProductError } from '../../../src/modules/orders/domain/errors/duplicate-order-product.error';
import { IdempotencyKeyConflictError } from '../../../src/modules/orders/domain/errors/idempotency-key-conflict.error';
import { IdempotencyRequestInProgressError } from '../../../src/modules/orders/domain/errors/idempotency-request-in-progress.error';
import { InvalidOrderCycleError } from '../../../src/modules/orders/domain/errors/invalid-order-cycle.error';
import { InvalidOrderDateError } from '../../../src/modules/orders/domain/errors/invalid-order-date.error';
import { InvalidOrderItemError } from '../../../src/modules/orders/domain/errors/invalid-order-item.error';
import { InvalidOrderNotesError } from '../../../src/modules/orders/domain/errors/invalid-order-notes.error';
import { OrderBrandInactiveError } from '../../../src/modules/orders/domain/errors/order-brand-inactive.error';
import { OrderBrandMismatchError } from '../../../src/modules/orders/domain/errors/order-brand-mismatch.error';
import { OrderProductInactiveError } from '../../../src/modules/orders/domain/errors/order-product-inactive.error';
import { InvalidProductPriceError } from '../../../src/modules/products/domain/errors/invalid-product-price.error';
import { ProductNotFoundError } from '../../../src/modules/products/domain/errors/product-not-found.error';

const actorId = '55c1e5bb-4795-485b-af90-a8d25d3d94b1';
const brandId = '26bf7359-befe-4eb9-bcc9-58fc72489be0';
const productId = '6a9028c4-b4dc-4132-b897-cd9e8049a33f';
const idempotencyKey = '94794ad2-1d17-4c4f-ae80-cb15a838c98c';

const createdOrder = {
  id: '84941232-a28f-4915-93c0-9fbd549e1a72',
  brand: {
    id: brandId,
    name: 'Natura',
    active: true,
    createdAt: '2026-08-02T12:00:00.000Z',
    updatedAt: '2026-08-02T12:00:00.000Z',
  },
  cycle: '12/2026',
  orderDate: '2026-08-02',
  receivedAt: null,
  canceledAt: null,
  cancelReason: null,
  status: 'OPEN' as const,
  notes: null,
  items: [
    {
      id: 'a380fa54-cab4-42b4-bd30-ff310850d879',
      productId,
      productCode: 'PERF-001',
      productDescription: 'Essencial feminino',
      quantityOrdered: 2,
      quantityReceived: 0,
      catalogUnitPrice: '149.90',
      purchaseUnitPrice: '89.00',
      originalUnitPrice: '179.90',
      expirationDate: null,
      notes: null,
    },
  ],
  createdAt: '2026-08-02T12:00:00.000Z',
  updatedAt: '2026-08-02T12:00:00.000Z',
};

const validInput = {
  actorId,
  idempotencyKey,
  brandId,
  cycle: '12/2026',
  orderDate: '2026-08-02',
  items: [
    {
      productId,
      quantityOrdered: 2,
      catalogUnitPrice: '149.90',
      purchaseUnitPrice: '89.00',
      originalUnitPrice: '179.90',
    },
  ],
};

function makeSubject(
  result: CreateOrderPersistenceResult = {
    status: 'created',
    order: createdOrder,
  },
) {
  const persistence: CreateOrderPersistence = {
    createIdempotently: vi.fn().mockResolvedValue(result),
  };

  return { useCase: new CreateOrderUseCase(persistence), persistence };
}

describe('CreateOrderUseCase', () => {
  it('normalizes the aggregate and sends a deterministic request hash', async () => {
    const subject = makeSubject();

    const result = await subject.useCase.execute({
      ...validInput,
      cycle: '  12/2026  ',
      notes: '  Campanha de agosto  ',
      items: [
        {
          ...validInput.items[0],
          catalogUnitPrice: '149.9',
          purchaseUnitPrice: '089',
          notes: '  Brinde incluído  ',
        },
      ],
      requestId: 'req-create-order',
    });

    expect(subject.persistence.createIdempotently).toHaveBeenCalledWith({
      actorId,
      idempotencyKey,
      idempotencyScope: `orders:create:user:${actorId}`,
      requestHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      brandId,
      cycle: '12/2026',
      orderDate: '2026-08-02',
      notes: 'Campanha de agosto',
      items: [
        {
          productId,
          quantityOrdered: 2,
          catalogUnitPrice: '149.90',
          purchaseUnitPrice: '89.00',
          originalUnitPrice: '179.90',
          notes: 'Brinde incluído',
        },
      ],
      requestId: 'req-create-order',
    });
    expect(result).toEqual(createdOrder);
  });

  it.each<{
    status: Exclude<CreateOrderPersistenceResult['status'], 'created' | 'replayed'>;
    error: new () => Error;
  }>([
    { status: 'brand_not_found', error: BrandNotFoundError },
    { status: 'product_not_found', error: ProductNotFoundError },
    { status: 'brand_inactive', error: OrderBrandInactiveError },
    { status: 'product_inactive', error: OrderProductInactiveError },
    { status: 'brand_mismatch', error: OrderBrandMismatchError },
    { status: 'idempotency_conflict', error: IdempotencyKeyConflictError },
    { status: 'idempotency_in_progress', error: IdempotencyRequestInProgressError },
  ])('maps persistence status $status to a domain error', async ({ status, error }) => {
    const subject = makeSubject({ status });

    await expect(subject.useCase.execute(validInput)).rejects.toBeInstanceOf(
      error,
    );
  });

  it('returns the original order when persistence replays the request', async () => {
    const subject = makeSubject({ status: 'replayed', order: createdOrder });

    await expect(subject.useCase.execute(validInput)).resolves.toBe(createdOrder);
  });

  it.each(['', '   ', 'a'.repeat(81)])(
    'rejects invalid cycle %j before persistence',
    async (cycle) => {
      const subject = makeSubject();
      await expect(
        subject.useCase.execute({ ...validInput, cycle }),
      ).rejects.toBeInstanceOf(InvalidOrderCycleError);
      expect(subject.persistence.createIdempotently).not.toHaveBeenCalled();
    },
  );

  it.each(['2026-02-30', '02/08/2026', 'invalid']) (
    'rejects invalid order date %j before persistence',
    async (orderDate) => {
      const subject = makeSubject();
      await expect(
        subject.useCase.execute({ ...validInput, orderDate }),
      ).rejects.toBeInstanceOf(InvalidOrderDateError);
    },
  );

  it('rejects repeated products before persistence', async () => {
    const subject = makeSubject();

    await expect(
      subject.useCase.execute({
        ...validInput,
        items: [validInput.items[0], validInput.items[0]],
      }),
    ).rejects.toBeInstanceOf(DuplicateOrderProductError);
    expect(subject.persistence.createIdempotently).not.toHaveBeenCalled();
  });

  it.each([
    { items: [] },
    { items: [{ ...validInput.items[0], quantityOrdered: 0 }] },
    { items: [{ ...validInput.items[0], quantityOrdered: 1.5 }] },
  ])('rejects invalid item structure before persistence: %j', async (change) => {
    const subject = makeSubject();

    await expect(
      subject.useCase.execute({ ...validInput, ...change }),
    ).rejects.toBeInstanceOf(InvalidOrderItemError);
    expect(subject.persistence.createIdempotently).not.toHaveBeenCalled();
  });

  it('rejects item notes longer than the database contract', async () => {
    const subject = makeSubject();

    await expect(
      subject.useCase.execute({
        ...validInput,
        items: [{ ...validInput.items[0], notes: 'a'.repeat(501) }],
      }),
    ).rejects.toBeInstanceOf(InvalidOrderNotesError);
  });

  it('rejects invalid snapshot prices before persistence', async () => {
    const subject = makeSubject();

    await expect(
      subject.useCase.execute({
        ...validInput,
        items: [{ ...validInput.items[0], purchaseUnitPrice: '-1' }],
      }),
    ).rejects.toBeInstanceOf(InvalidProductPriceError);
  });
});
