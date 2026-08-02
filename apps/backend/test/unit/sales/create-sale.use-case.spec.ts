import { describe, expect, it, vi } from 'vitest';

import type { CreateSalePersistence } from '../../../src/modules/sales/application/ports/create-sale-persistence';
import { CreateSaleUseCase } from '../../../src/modules/sales/application/use-cases/create-sale.use-case';
import { DuplicateSaleProductError } from '../../../src/modules/sales/domain/errors/duplicate-sale-product.error';
import { InvalidSaleItemError } from '../../../src/modules/sales/domain/errors/invalid-sale-item.error';
import { SaleCustomerInactiveError } from '../../../src/modules/sales/domain/errors/sale-customer-inactive.error';
import { SaleCustomerNotFoundError } from '../../../src/modules/sales/domain/errors/sale-customer-not-found.error';
import { SaleIdempotencyKeyConflictError } from '../../../src/modules/sales/domain/errors/sale-idempotency-key-conflict.error';
import { SaleProductInactiveError } from '../../../src/modules/sales/domain/errors/sale-product-inactive.error';
import { SaleProductNotFoundError } from '../../../src/modules/sales/domain/errors/sale-product-not-found.error';
import { NegativeStockConfirmationRequiredError } from '../../../src/modules/inventory/domain/errors/negative-stock-confirmation-required.error';

const actorId = '55c1e5bb-4795-485b-af90-a8d25d3d94b1';
const productId = '26bf7359-befe-4eb9-bcc9-58fc72489be0';
const sale = {
  id: 'sale-id',
  customer: null,
  status: 'COMPLETED' as const,
  saleDate: '2026-08-02T12:00:00.000Z',
  paymentMethod: null,
  total: '0.00',
  notes: null,
  canceledAt: null,
  cancelReason: null,
  items: [],
  createdAt: '2026-08-02T12:00:00.000Z',
  updatedAt: '2026-08-02T12:00:00.000Z',
};

const invalidItemSets: Array<
  Array<{ productId: string; quantity: number; unitPrice: string }>
> = [
  [],
  [{ productId, quantity: 0, unitPrice: '10.00' }],
  [{ productId, quantity: 1.5, unitPrice: '10.00' }],
  [{ productId, quantity: 1, unitPrice: '-1.00' }],
  [{ productId, quantity: 1, unitPrice: '1.001' }],
];

function makeSubject(
  result: Awaited<ReturnType<CreateSalePersistence['createIdempotently']>> = {
    status: 'created',
    sale,
  },
) {
  const persistence: CreateSalePersistence = {
    createIdempotently: vi.fn().mockResolvedValue(result),
  };
  return { useCase: new CreateSaleUseCase(persistence), persistence };
}

describe('CreateSaleUseCase', () => {
  it('normalizes the sale, calculates totals and scopes idempotency by actor', async () => {
    const subject = makeSubject();

    const result = await subject.useCase.execute({
      actorId,
      idempotencyKey: 'e1d2a714-7e62-4f65-94d2-75409ec83a31',
      customerId: null,
      paymentMethod: 'PIX',
      notes: ' Entrega no sábado ',
      confirmNegativeStock: false,
      items: [
        { productId, quantity: 2, unitPrice: '10.5' },
        {
          productId: 'bfab0010-f11e-4e5f-ad4b-a531c32b6472',
          quantity: 3,
          unitPrice: '7.25',
        },
      ],
      requestId: 'req-create-sale',
    });

    expect(subject.persistence.createIdempotently).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId,
        idempotencyScope: `sales:create:user:${actorId}`,
        customerId: null,
        paymentMethod: 'PIX',
        notes: 'Entrega no sábado',
        confirmNegativeStock: false,
        total: '42.75',
        items: [
          { productId, quantity: 2, unitPrice: '10.50', subtotal: '21.00' },
          {
            productId: 'bfab0010-f11e-4e5f-ad4b-a531c32b6472',
            quantity: 3,
            unitPrice: '7.25',
            subtotal: '21.75',
          },
        ],
        requestHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        requestId: 'req-create-sale',
      }),
    );
    expect(result.id).toBe('sale-id');
  });

  it('normalizes omitted optional values to null and confirmation to false', async () => {
    const subject = makeSubject();
    await subject.useCase.execute({
      actorId,
      idempotencyKey: 'e1d2a714-7e62-4f65-94d2-75409ec83a31',
      items: [{ productId, quantity: 1, unitPrice: '0' }],
    });
    expect(subject.persistence.createIdempotently).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: null,
        paymentMethod: null,
        notes: null,
        confirmNegativeStock: false,
        total: '0.00',
      }),
    );
  });

  it.each(invalidItemSets.map((items) => [items] as const))('rejects invalid items %j before persistence', async (items) => {
    const subject = makeSubject();
    await expect(
      subject.useCase.execute({
        actorId,
        idempotencyKey: 'e1d2a714-7e62-4f65-94d2-75409ec83a31',
        items,
      }),
    ).rejects.toBeInstanceOf(InvalidSaleItemError);
    expect(subject.persistence.createIdempotently).not.toHaveBeenCalled();
  });

  it('rejects repeated products before persistence', async () => {
    const subject = makeSubject();
    await expect(
      subject.useCase.execute({
        actorId,
        idempotencyKey: 'e1d2a714-7e62-4f65-94d2-75409ec83a31',
        items: [
          { productId, quantity: 1, unitPrice: '10' },
          { productId, quantity: 2, unitPrice: '11' },
        ],
      }),
    ).rejects.toBeInstanceOf(DuplicateSaleProductError);
  });

  it.each([
    ['customer_not_found', SaleCustomerNotFoundError],
    ['customer_inactive', SaleCustomerInactiveError],
    ['product_not_found', SaleProductNotFoundError],
    ['product_inactive', SaleProductInactiveError],
    ['negative_stock_confirmation_required', NegativeStockConfirmationRequiredError],
    ['idempotency_conflict', SaleIdempotencyKeyConflictError],
  ] as const)('maps persistence status %s to its domain error', async (status, ErrorType) => {
    const subject = makeSubject({ status });
    await expect(
      subject.useCase.execute({
        actorId,
        idempotencyKey: 'e1d2a714-7e62-4f65-94d2-75409ec83a31',
        items: [{ productId, quantity: 1, unitPrice: '10' }],
      }),
    ).rejects.toBeInstanceOf(ErrorType);
  });
});
