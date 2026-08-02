import { describe, expect, it, vi } from 'vitest';

import type {
  CreateProductPersistence,
  CreateProductPersistenceResult,
} from '../../../src/modules/products/application/ports/create-product-persistence';
import { CreateProductUseCase } from '../../../src/modules/products/application/use-cases/create-product.use-case';
import { InactiveProductBrandError } from '../../../src/modules/products/domain/errors/inactive-product-brand.error';
import { InactiveProductCategoryError } from '../../../src/modules/products/domain/errors/inactive-product-category.error';
import { InvalidProductCodeError } from '../../../src/modules/products/domain/errors/invalid-product-code.error';
import { InvalidProductDescriptionError } from '../../../src/modules/products/domain/errors/invalid-product-description.error';
import { InvalidProductPriceError } from '../../../src/modules/products/domain/errors/invalid-product-price.error';
import { ProductAlreadyExistsError } from '../../../src/modules/products/domain/errors/product-already-exists.error';
import { BrandNotFoundError } from '../../../src/modules/brands/domain/errors/brand-not-found.error';
import { CategoryNotFoundError } from '../../../src/modules/categories/domain/errors/category-not-found.error';

const actorId = '55c1e5bb-4795-485b-af90-a8d25d3d94b1';
const brandId = '26bf7359-befe-4eb9-bcc9-58fc72489be0';
const categoryId = 'bfab0010-f11e-4e5f-ad4b-a531c32b6472';
const createdAt = new Date('2026-08-02T12:00:00.000Z');

const createdProduct = {
  id: '6a9028c4-b4dc-4132-b897-cd9e8049a33f',
  brand: {
    id: brandId,
    name: 'Natura',
    active: true,
    createdAt,
    updatedAt: createdAt,
  },
  category: {
    id: categoryId,
    name: 'Perfumaria',
    active: true,
    createdAt,
    updatedAt: createdAt,
  },
  code: 'PERF-001',
  description: 'Essencial feminino',
  catalogPrice: '149.90',
  purchasePrice: '89.00',
  originalPrice: '179.90',
  suggestedSalePrice: null,
  active: true,
  createdAt,
  updatedAt: createdAt,
};

const validInput = {
  actorId,
  brandId,
  categoryId,
  code: 'PERF-001',
  description: 'Essencial feminino',
  catalogPrice: '149.90',
  purchasePrice: '89.00',
  originalPrice: '179.90',
};

function makeSubject(
  result: CreateProductPersistenceResult = {
    status: 'created',
    product: createdProduct,
  },
) {
  const persistence: CreateProductPersistence = {
    createWithAudit: vi.fn().mockResolvedValue(result),
  };
  const useCase = new CreateProductUseCase(persistence);

  return { useCase, persistence };
}

describe('CreateProductUseCase', () => {
  it('normalizes product data and keeps the suggested price optional', async () => {
    const subject = makeSubject();

    const result = await subject.useCase.execute({
      ...validInput,
      code: '  PERF-001  ',
      description: '  Essencial feminino  ',
      catalogPrice: '149.9',
      purchasePrice: '089',
      originalPrice: '179.90',
      requestId: 'req-create-product',
    });

    expect(subject.persistence.createWithAudit).toHaveBeenCalledWith({
      actorId,
      brandId,
      categoryId,
      code: 'PERF-001',
      normalizedCode: 'perf-001',
      description: 'Essencial feminino',
      catalogPrice: '149.90',
      purchasePrice: '89.00',
      originalPrice: '179.90',
      suggestedSalePrice: null,
      requestId: 'req-create-product',
    });
    expect(result).toEqual(createdProduct);
  });

  it.each<{
    status: Exclude<CreateProductPersistenceResult['status'], 'created'>;
    error: new () => Error;
  }>([
    { status: 'duplicate', error: ProductAlreadyExistsError },
    { status: 'brand_not_found', error: BrandNotFoundError },
    { status: 'category_not_found', error: CategoryNotFoundError },
    { status: 'brand_inactive', error: InactiveProductBrandError },
    { status: 'category_inactive', error: InactiveProductCategoryError },
  ])('maps persistence status $status to its domain error', async ({ status, error }) => {
    const subject = makeSubject({ status });

    await expect(subject.useCase.execute(validInput)).rejects.toBeInstanceOf(
      error,
    );
  });

  it.each(['', '   ', 'a'.repeat(81)])(
    'rejects the invalid code %j before persistence',
    async (code) => {
      const subject = makeSubject();

      await expect(
        subject.useCase.execute({ ...validInput, code }),
      ).rejects.toBeInstanceOf(InvalidProductCodeError);
      expect(subject.persistence.createWithAudit).not.toHaveBeenCalled();
    },
  );

  it.each(['', '   ', 'a'.repeat(256)])(
    'rejects the invalid description before persistence',
    async (description) => {
      const subject = makeSubject();

      await expect(
        subject.useCase.execute({ ...validInput, description }),
      ).rejects.toBeInstanceOf(InvalidProductDescriptionError);
      expect(subject.persistence.createWithAudit).not.toHaveBeenCalled();
    },
  );

  it.each([
    { catalogPrice: '-1' },
    { purchasePrice: '10.999' },
    { originalPrice: 'invalid' },
    { catalogPrice: '10000000000.00' },
    { suggestedSalePrice: '12.999' },
  ])('rejects invalid prices before persistence: %j', async (prices) => {
    const subject = makeSubject();

    await expect(
      subject.useCase.execute({ ...validInput, ...prices }),
    ).rejects.toBeInstanceOf(InvalidProductPriceError);
    expect(subject.persistence.createWithAudit).not.toHaveBeenCalled();
  });
});
