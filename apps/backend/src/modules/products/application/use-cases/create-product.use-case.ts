import { BrandNotFoundError } from '../../../brands/domain/errors/brand-not-found.error';
import { CategoryNotFoundError } from '../../../categories/domain/errors/category-not-found.error';
import { InactiveProductBrandError } from '../../domain/errors/inactive-product-brand.error';
import { InactiveProductCategoryError } from '../../domain/errors/inactive-product-category.error';
import { ProductAlreadyExistsError } from '../../domain/errors/product-already-exists.error';
import { ProductCode } from '../../domain/value-objects/product-code';
import { ProductDescription } from '../../domain/value-objects/product-description';
import { ProductPrice } from '../../domain/value-objects/product-price';
import type {
  CreateProductPersistence,
  PersistedProduct,
} from '../ports/create-product-persistence';

export interface CreateProductInput {
  actorId: string;
  brandId: string;
  categoryId: string;
  code: string;
  description: string;
  catalogPrice: string;
  purchasePrice: string;
  originalPrice: string;
  suggestedSalePrice?: string | null;
  requestId?: string;
}

export type CreateProductOutput = PersistedProduct;

export class CreateProductUseCase {
  constructor(private readonly persistence: CreateProductPersistence) {}

  async execute(input: CreateProductInput): Promise<CreateProductOutput> {
    const code = ProductCode.create(input.code);
    const description = ProductDescription.create(input.description);
    const result = await this.persistence.createWithAudit({
      actorId: input.actorId,
      brandId: input.brandId,
      categoryId: input.categoryId,
      code: code.value,
      normalizedCode: code.normalizedValue,
      description: description.value,
      catalogPrice: ProductPrice.create(input.catalogPrice).value,
      purchasePrice: ProductPrice.create(input.purchasePrice).value,
      originalPrice: ProductPrice.create(input.originalPrice).value,
      suggestedSalePrice: ProductPrice.createOptional(input.suggestedSalePrice)
        ?.value ?? null,
      requestId: input.requestId,
    });

    if (result.status === 'duplicate') {
      throw new ProductAlreadyExistsError();
    }

    if (result.status === 'brand_not_found') {
      throw new BrandNotFoundError();
    }

    if (result.status === 'category_not_found') {
      throw new CategoryNotFoundError();
    }

    if (result.status === 'brand_inactive') {
      throw new InactiveProductBrandError();
    }

    if (result.status === 'category_inactive') {
      throw new InactiveProductCategoryError();
    }

    return result.product;
  }
}
