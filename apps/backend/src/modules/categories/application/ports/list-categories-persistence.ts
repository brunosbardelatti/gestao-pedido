import type { PersistedCategory } from './create-category-persistence';

export interface ListCategoriesPersistenceInput {
  page: number;
  pageSize: number;
  search?: string;
}

export interface ListCategoriesPersistenceOutput {
  items: PersistedCategory[];
  total: number;
}

export interface ListCategoriesPersistence {
  list(
    input: ListCategoriesPersistenceInput,
  ): Promise<ListCategoriesPersistenceOutput>;
}
