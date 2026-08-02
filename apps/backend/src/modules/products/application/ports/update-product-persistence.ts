import type { PersistedProduct } from './create-product-persistence';

export interface UpdateProductPersistenceInput {
  actorId: string;
  productId: string;
  brandId: string;
  categoryId: string;
  code: string;
  normalizedCode: string;
  description: string;
  catalogPrice: string;
  purchasePrice: string;
  originalPrice: string;
  suggestedSalePrice: string | null;
  requestId?: string;
}

export type UpdateProductPersistenceResult =
  | { status: 'updated'; product: PersistedProduct }
  | { status: 'not_found' }
  | { status: 'conflict' }
  | { status: 'brand_not_found' }
  | { status: 'category_not_found' };

export interface UpdateProductPersistence {
  updateWithAudit(
    input: UpdateProductPersistenceInput,
  ): Promise<UpdateProductPersistenceResult>;
}
