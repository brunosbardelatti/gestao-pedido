import { describe, expect, it, vi } from 'vitest';

import type { PersistedProduct } from '../../../src/modules/products/application/ports/create-product-persistence';
import type { GetProductPersistence } from '../../../src/modules/products/application/ports/get-product-persistence';
import { GetProductUseCase } from '../../../src/modules/products/application/use-cases/get-product.use-case';
import { ProductNotFoundError } from '../../../src/modules/products/domain/errors/product-not-found.error';

describe('GetProductUseCase', () => {
  it('returns the requested product', async () => {
    const productId = '6a9028c4-b4dc-4132-b897-cd9e8049a33f';
    const product = { id: productId } as PersistedProduct;
    const persistence: GetProductPersistence = {
      findById: vi.fn().mockResolvedValue(product),
    };

    await expect(
      new GetProductUseCase(persistence).execute(productId),
    ).resolves.toBe(product);
  });

  it('rejects an unknown product', async () => {
    const persistence: GetProductPersistence = {
      findById: vi.fn().mockResolvedValue(null),
    };

    await expect(
      new GetProductUseCase(persistence).execute(
        '6a9028c4-b4dc-4132-b897-cd9e8049a33f',
      ),
    ).rejects.toBeInstanceOf(ProductNotFoundError);
  });
});
