import type { PersistedBrand } from './create-brand-persistence';

export interface ListBrandsPersistenceInput {
  page: number;
  pageSize: number;
  search?: string;
}

export interface ListBrandsPersistenceOutput {
  items: PersistedBrand[];
  total: number;
}

export interface ListBrandsPersistence {
  list(
    input: ListBrandsPersistenceInput,
  ): Promise<ListBrandsPersistenceOutput>;
}
