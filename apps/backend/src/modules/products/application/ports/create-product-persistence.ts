export interface PersistedProductReference {
  id: string;
  name: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PersistedProduct {
  id: string;
  brand: PersistedProductReference;
  category: PersistedProductReference;
  code: string;
  description: string;
  catalogPrice: string;
  purchasePrice: string;
  originalPrice: string;
  suggestedSalePrice: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProductPersistenceInput {
  actorId: string;
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

export type CreateProductPersistenceResult =
  | { status: 'created'; product: PersistedProduct }
  | { status: 'duplicate' }
  | { status: 'brand_not_found' }
  | { status: 'category_not_found' }
  | { status: 'brand_inactive' }
  | { status: 'category_inactive' };

export interface CreateProductPersistence {
  createWithAudit(
    input: CreateProductPersistenceInput,
  ): Promise<CreateProductPersistenceResult>;
}
