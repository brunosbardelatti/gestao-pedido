import { describe, expect, it, vi } from 'vitest';

import type {
  SetProductActivePersistence,
  SetProductActivePersistenceResult,
} from '../../../src/modules/products/application/ports/set-product-active-persistence';
import { SetProductActiveUseCase } from '../../../src/modules/products/application/use-cases/set-product-active.use-case';
import { ProductNotFoundError } from '../../../src/modules/products/domain/errors/product-not-found.error';

const actorId = '55c1e5bb-4795-485b-af90-a8d25d3d94b1';
const productId = '6a9028c4-b4dc-4132-b897-cd9e8049a33f';
const updatedAt = new Date('2026-08-02T17:00:00.000Z');
const persistedProduct = {
  id: productId,
  brand: {
    id: '26bf7359-befe-4eb9-bcc9-58fc72489be0',
    name: 'Natura',
    active: true,
    createdAt: updatedAt,
    updatedAt,
  },
  category: {
    id: 'bfab0010-f11e-4e5f-ad4b-a531c32b6472',
    name: 'Perfumaria',
    active: true,
    createdAt: updatedAt,
    updatedAt,
  },
  code: 'PERF-001',
  description: 'Essencial feminino',
  catalogPrice: '149.90',
  purchasePrice: '89.00',
  originalPrice: '179.90',
  suggestedSalePrice: '169.90',
  active: false,
  createdAt: updatedAt,
  updatedAt,
};

function makeSubject(
  result: SetProductActivePersistenceResult = {
    status: 'updated',
    product: persistedProduct,
  },
) {
  const persistence: SetProductActivePersistence = {
    setActiveWithAudit: vi.fn().mockResolvedValue(result),
  };

  return {
    useCase: new SetProductActiveUseCase(persistence),
    persistence,
  };
}

describe('SetProductActiveUseCase', () => {
  it('deactivates the product with audit context', async () => {
    const subject = makeSubject();

    const result = await subject.useCase.execute({
      actorId,
      productId,
      active: false,
      requestId: 'req-deactivate-product',
    });

    expect(subject.persistence.setActiveWithAudit).toHaveBeenCalledWith({
      actorId,
      productId,
      active: false,
      requestId: 'req-deactivate-product',
    });
    expect(result).toMatchObject({ id: productId, active: false });
  });

  it('supports reactivation defined by the HTTP contract', async () => {
    const subject = makeSubject({
      status: 'updated',
      product: { ...persistedProduct, active: true },
    });
    const product = await subject.useCase.execute({
      actorId,
      productId,
      active: true,
    });

    expect(subject.persistence.setActiveWithAudit).toHaveBeenCalledWith({
      actorId,
      productId,
      active: true,
      requestId: undefined,
    });
    expect(product.active).toBe(true);
  });

  it('rejects an unknown product', async () => {
    const subject = makeSubject({ status: 'not_found' });

    await expect(
      subject.useCase.execute({ actorId, productId, active: false }),
    ).rejects.toBeInstanceOf(ProductNotFoundError);
  });
});
