import { BrandNotFoundError } from '../../../brands/domain/errors/brand-not-found.error';
import { CategoryNotFoundError } from '../../../categories/domain/errors/category-not-found.error';
import { ProductAlreadyExistsError } from '../../domain/errors/product-already-exists.error';
import { ProductNotFoundError } from '../../domain/errors/product-not-found.error';
import { ProductCode } from '../../domain/value-objects/product-code';
import { ProductDescription } from '../../domain/value-objects/product-description';
import { ProductPrice } from '../../domain/value-objects/product-price';
import type { PersistedProduct } from '../ports/create-product-persistence';
import type { UpdateProductPersistence } from '../ports/update-product-persistence';

export interface UpdateProductInput {
  actorId: string;
  productId: string;
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

export type UpdateProductOutput = PersistedProduct;

export class UpdateProductUseCase {
  constructor(private readonly persistence: UpdateProductPersistence) {}

  async execute(input: UpdateProductInput): Promise<UpdateProductOutput> {
    const code = ProductCode.create(input.code);
    const description = ProductDescription.create(input.description);
    const result = await this.persistence.updateWithAudit({
      actorId: input.actorId,
      productId: input.productId,
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

    if (result.status === 'not_found') throw new ProductNotFoundError();
    if (result.status === 'conflict') throw new ProductAlreadyExistsError();
    if (result.status === 'brand_not_found') throw new BrandNotFoundError();
    if (result.status === 'category_not_found') {
      throw new CategoryNotFoundError();
    }

    return result.product;
  }
}
