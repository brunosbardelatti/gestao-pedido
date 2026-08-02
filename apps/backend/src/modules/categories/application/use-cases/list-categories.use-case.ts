import type { PersistedCategory } from '../ports/create-category-persistence';
import type { ListCategoriesPersistence } from '../ports/list-categories-persistence';

export interface ListCategoriesInput {
  page: number;
  pageSize: number;
  search?: string;
}

export interface ListCategoriesOutput {
  items: PersistedCategory[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export class ListCategoriesUseCase {
  constructor(private readonly persistence: ListCategoriesPersistence) {}

  async execute(input: ListCategoriesInput): Promise<ListCategoriesOutput> {
    const search = input.search?.normalize('NFKC').trim() || undefined;
    const result = await this.persistence.list({
      page: input.page,
      pageSize: input.pageSize,
      search,
    });

    return {
      items: result.items,
      meta: {
        page: input.page,
        pageSize: input.pageSize,
        total: result.total,
        totalPages: Math.ceil(result.total / input.pageSize),
      },
    };
  }
}
