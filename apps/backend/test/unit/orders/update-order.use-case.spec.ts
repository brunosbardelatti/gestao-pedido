import { describe, expect, it, vi } from 'vitest';

import { BrandNotFoundError } from '../../../src/modules/brands/domain/errors/brand-not-found.error';
import type {
  UpdateOrderPersistence,
  UpdateOrderPersistenceResult,
} from '../../../src/modules/orders/application/ports/update-order-persistence';
import { UpdateOrderUseCase } from '../../../src/modules/orders/application/use-cases/update-order.use-case';
import { DuplicateOrderProductError } from '../../../src/modules/orders/domain/errors/duplicate-order-product.error';
import { InvalidOrderCycleError } from '../../../src/modules/orders/domain/errors/invalid-order-cycle.error';
import { InvalidOrderDateError } from '../../../src/modules/orders/domain/errors/invalid-order-date.error';
import { InvalidOrderItemError } from '../../../src/modules/orders/domain/errors/invalid-order-item.error';
import { OrderBrandInactiveError } from '../../../src/modules/orders/domain/errors/order-brand-inactive.error';
import { OrderBrandMismatchError } from '../../../src/modules/orders/domain/errors/order-brand-mismatch.error';
import { OrderNotEditableError } from '../../../src/modules/orders/domain/errors/order-not-editable.error';
import { OrderNotFoundError } from '../../../src/modules/orders/domain/errors/order-not-found.error';
import { OrderProductInactiveError } from '../../../src/modules/orders/domain/errors/order-product-inactive.error';
import { ProductNotFoundError } from '../../../src/modules/products/domain/errors/product-not-found.error';

const actorId = '55c1e5bb-4795-485b-af90-a8d25d3d94b1';
const orderId = 'abfb53af-ec77-4551-9ab2-2e6caf4f24fb';
const brandId = '26bf7359-befe-4eb9-bcc9-58fc72489be0';
const firstProductId = '6a9028c4-b4dc-4132-b897-cd9e8049a33f';
const secondProductId = 'dba99dc7-61ed-489f-a016-a4a614850871';

const updatedOrder = {
  id: orderId,
  brand: {
    id: brandId,
    name: 'Natura',
    active: true,
    createdAt: '2026-08-02T10:00:00.000Z',
    updatedAt: '2026-08-02T10:00:00.000Z',
  },
  cycle: '13/2026',
  orderDate: '2026-08-03',
  receivedAt: null,
  canceledAt: null,
  cancelReason: null,
  status: 'OPEN' as const,
  notes: 'Reposição da campanha',
  items: [],
  createdAt: '2026-08-02T10:00:00.000Z',
  updatedAt: '2026-08-03T10:00:00.000Z',
};

const validInput = {
  actorId,
  orderId,
  brandId,
  cycle: '13/2026',
  orderDate: '2026-08-03',
  notes: 'Reposição da campanha',
  items: [
    {
      productId: firstProductId,
      quantityOrdered: 2,
      catalogUnitPrice: '149.90',
      purchaseUnitPrice: '89.00',
      originalUnitPrice: '179.90',
      notes: 'Caixa íntegra',
    },
  ],
};

function makeSubject(
  result: UpdateOrderPersistenceResult = {
    status: 'updated',
    order: updatedOrder,
  },
) {
  const persistence: UpdateOrderPersistence = {
    updateWithAudit: vi.fn().mockResolvedValue(result),
  };

  return {
    persistence,
    useCase: new UpdateOrderUseCase(persistence),
  };
}

describe('UpdateOrderUseCase', () => {
  it('normalizes the complete open-order aggregate before persistence', async () => {
    const subject = makeSubject();

    const result = await subject.useCase.execute({
      ...validInput,
      cycle: '  13/2026  ',
      notes: '  Reposição da campanha  ',
      requestId: 'req-update-order',
      items: [
        {
          ...validInput.items[0],
          catalogUnitPrice: '149.9',
          purchaseUnitPrice: '089',
          notes: '  Caixa íntegra  ',
        },
      ],
    });

    expect(subject.persistence.updateWithAudit).toHaveBeenCalledWith({
      actorId,
      orderId,
      brandId,
      cycle: '13/2026',
      orderDate: '2026-08-03',
      notes: 'Reposição da campanha',
      items: [
        {
          productId: firstProductId,
          quantityOrdered: 2,
          catalogUnitPrice: '149.90',
          purchaseUnitPrice: '89.00',
          originalUnitPrice: '179.90',
          notes: 'Caixa íntegra',
        },
      ],
      requestId: 'req-update-order',
    });
    expect(result).toEqual(updatedOrder);
  });

  it.each<{
    status: Exclude<UpdateOrderPersistenceResult['status'], 'updated'>;
    error: new () => Error;
  }>([
    { status: 'not_found', error: OrderNotFoundError },
    { status: 'not_editable', error: OrderNotEditableError },
    { status: 'brand_not_found', error: BrandNotFoundError },
    { status: 'brand_inactive', error: OrderBrandInactiveError },
    { status: 'product_not_found', error: ProductNotFoundError },
    { status: 'product_inactive', error: OrderProductInactiveError },
    { status: 'brand_mismatch', error: OrderBrandMismatchError },
  ])('maps persistence status $status to its domain error', async ({ status, error }) => {
    const subject = makeSubject({ status });

    await expect(subject.useCase.execute(validInput)).rejects.toBeInstanceOf(
      error,
    );
  });

  it.each(['', '   ', 'a'.repeat(81)])(
    'rejects invalid cycle %j before persistence',
    async (cycle) => {
      const subject = makeSubject();

      await expect(
        subject.useCase.execute({ ...validInput, cycle }),
      ).rejects.toBeInstanceOf(InvalidOrderCycleError);
      expect(subject.persistence.updateWithAudit).not.toHaveBeenCalled();
    },
  );

  it.each(['02/08/2026', '2026-02-30', '']) (
    'rejects invalid order date %j before persistence',
    async (orderDate) => {
      const subject = makeSubject();

      await expect(
        subject.useCase.execute({ ...validInput, orderDate }),
      ).rejects.toBeInstanceOf(InvalidOrderDateError);
      expect(subject.persistence.updateWithAudit).not.toHaveBeenCalled();
    },
  );

  it.each([
    { items: [] },
    {
      items: [{ ...validInput.items[0], quantityOrdered: 0 }],
    },
    {
      items: [{ ...validInput.items[0], quantityOrdered: 1.5 }],
    },
  ])('rejects invalid item data before persistence: %j', async (invalid) => {
    const subject = makeSubject();

    await expect(
      subject.useCase.execute({ ...validInput, ...invalid }),
    ).rejects.toBeInstanceOf(InvalidOrderItemError);
    expect(subject.persistence.updateWithAudit).not.toHaveBeenCalled();
  });

  it('rejects duplicate products before persistence', async () => {
    const subject = makeSubject();

    await expect(
      subject.useCase.execute({
        ...validInput,
        items: [
          validInput.items[0],
          {
            ...validInput.items[0],
            productId: firstProductId,
            quantityOrdered: 3,
          },
        ],
      }),
    ).rejects.toBeInstanceOf(DuplicateOrderProductError);
    expect(subject.persistence.updateWithAudit).not.toHaveBeenCalled();
  });

  it('accepts a replacement set containing different products', async () => {
    const subject = makeSubject();

    await subject.useCase.execute({
      ...validInput,
      items: [
        validInput.items[0],
        { ...validInput.items[0], productId: secondProductId },
      ],
    });

    expect(subject.persistence.updateWithAudit).toHaveBeenCalledOnce();
  });
});
