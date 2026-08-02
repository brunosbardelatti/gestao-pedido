import { describe, expect, it, vi } from 'vitest';

import { BrandNotFoundError } from '../../../src/modules/brands/domain/errors/brand-not-found.error';
import { CategoryNotFoundError } from '../../../src/modules/categories/domain/errors/category-not-found.error';
import type {
  UpdateProductPersistence,
  UpdateProductPersistenceResult,
} from '../../../src/modules/products/application/ports/update-product-persistence';
import { UpdateProductUseCase } from '../../../src/modules/products/application/use-cases/update-product.use-case';
import { InvalidProductCodeError } from '../../../src/modules/products/domain/errors/invalid-product-code.error';
import { InvalidProductDescriptionError } from '../../../src/modules/products/domain/errors/invalid-product-description.error';
import { InvalidProductPriceError } from '../../../src/modules/products/domain/errors/invalid-product-price.error';
import { ProductAlreadyExistsError } from '../../../src/modules/products/domain/errors/product-already-exists.error';
import { ProductNotFoundError } from '../../../src/modules/products/domain/errors/product-not-found.error';

const actorId = '55c1e5bb-4795-485b-af90-a8d25d3d94b1';
const productId = '6a9028c4-b4dc-4132-b897-cd9e8049a33f';
const brandId = '26bf7359-befe-4eb9-bcc9-58fc72489be0';
const categoryId = 'bfab0010-f11e-4e5f-ad4b-a531c32b6472';
const updatedAt = new Date('2026-08-02T13:00:00.000Z');

const updatedProduct = {
  id: productId,
  brand: {
    id: brandId,
    name: 'Natura',
    active: true,
    createdAt: updatedAt,
    updatedAt,
  },
  category: {
    id: categoryId,
    name: 'Perfumaria',
    active: true,
    createdAt: updatedAt,
    updatedAt,
  },
  code: 'PERF-002',
  description: 'Essencial feminino atualizado',
  catalogPrice: '159.90',
  purchasePrice: '99.00',
  originalPrice: '189.90',
  suggestedSalePrice: '169.90',
  active: true,
  createdAt: updatedAt,
  updatedAt,
};

const validInput = {
  actorId,
  productId,
  brandId,
  categoryId,
  code: 'PERF-002',
  description: 'Essencial feminino atualizado',
  catalogPrice: '159.90',
  purchasePrice: '99.00',
  originalPrice: '189.90',
  suggestedSalePrice: '169.90',
};

function makeSubject(
  result: UpdateProductPersistenceResult = {
    status: 'updated',
    product: updatedProduct,
  },
) {
  const persistence: UpdateProductPersistence = {
    updateWithAudit: vi.fn().mockResolvedValue(result),
  };

  return {
    useCase: new UpdateProductUseCase(persistence),
    persistence,
  };
}

describe('UpdateProductUseCase', () => {
  it('normalizes all editable fields before persistence', async () => {
    const subject = makeSubject();

    const result = await subject.useCase.execute({
      ...validInput,
      code: '  PERF-002  ',
      description: '  Essencial feminino atualizado  ',
      catalogPrice: '159.9',
      purchasePrice: '099',
      suggestedSalePrice: null,
      requestId: 'req-update-product',
    });

    expect(subject.persistence.updateWithAudit).toHaveBeenCalledWith({
      actorId,
      productId,
      brandId,
      categoryId,
      code: 'PERF-002',
      normalizedCode: 'perf-002',
      description: 'Essencial feminino atualizado',
      catalogPrice: '159.90',
      purchasePrice: '99.00',
      originalPrice: '189.90',
      suggestedSalePrice: null,
      requestId: 'req-update-product',
    });
    expect(result).toEqual(updatedProduct);
  });

  it.each<{
    status: Exclude<UpdateProductPersistenceResult['status'], 'updated'>;
    error: new () => Error;
  }>([
    { status: 'not_found', error: ProductNotFoundError },
    { status: 'conflict', error: ProductAlreadyExistsError },
    { status: 'brand_not_found', error: BrandNotFoundError },
    { status: 'category_not_found', error: CategoryNotFoundError },
  ])('maps persistence status $status to its domain error', async ({ status, error }) => {
    const subject = makeSubject({ status });

    await expect(subject.useCase.execute(validInput)).rejects.toBeInstanceOf(
      error,
    );
  });

  it.each(['', '   ', 'a'.repeat(81)])(
    'rejects invalid code %j before persistence',
    async (code) => {
      const subject = makeSubject();

      await expect(
        subject.useCase.execute({ ...validInput, code }),
      ).rejects.toBeInstanceOf(InvalidProductCodeError);
      expect(subject.persistence.updateWithAudit).not.toHaveBeenCalled();
    },
  );

  it.each(['', '   ', 'a'.repeat(256)])(
    'rejects invalid description before persistence',
    async (description) => {
      const subject = makeSubject();

      await expect(
        subject.useCase.execute({ ...validInput, description }),
      ).rejects.toBeInstanceOf(InvalidProductDescriptionError);
      expect(subject.persistence.updateWithAudit).not.toHaveBeenCalled();
    },
  );

  it.each([
    { catalogPrice: '-1' },
    { purchasePrice: '10.999' },
    { originalPrice: 'invalid' },
    { suggestedSalePrice: '12.999' },
  ])('rejects invalid prices before persistence: %j', async (prices) => {
    const subject = makeSubject();

    await expect(
      subject.useCase.execute({ ...validInput, ...prices }),
    ).rejects.toBeInstanceOf(InvalidProductPriceError);
    expect(subject.persistence.updateWithAudit).not.toHaveBeenCalled();
  });
});
