import type { PersistedProduct } from './create-product-persistence';

export interface ListProductsPersistenceInput {
  page: number;
  pageSize: number;
  search?: string;
  brandId?: string;
  categoryId?: string;
  active?: boolean;
}

export interface ListProductsPersistenceResult {
  items: PersistedProduct[];
  total: number;
}

export interface ListProductsPersistence {
  list(
    input: ListProductsPersistenceInput,
  ): Promise<ListProductsPersistenceResult>;
}
