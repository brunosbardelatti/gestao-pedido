import type { PersistedProduct } from './create-product-persistence';

export interface GetProductPersistence {
  findById(productId: string): Promise<PersistedProduct | null>;
}
