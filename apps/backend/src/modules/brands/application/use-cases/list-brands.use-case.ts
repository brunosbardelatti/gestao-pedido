import type { PersistedBrand } from '../ports/create-brand-persistence';
import type { ListBrandsPersistence } from '../ports/list-brands-persistence';

export interface ListBrandsInput {
  page: number;
  pageSize: number;
  search?: string;
}

export interface ListBrandsOutput {
  items: PersistedBrand[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export class ListBrandsUseCase {
  constructor(private readonly persistence: ListBrandsPersistence) {}

  async execute(input: ListBrandsInput): Promise<ListBrandsOutput> {
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
