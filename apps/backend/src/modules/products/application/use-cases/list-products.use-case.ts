import type { PersistedProduct } from '../ports/create-product-persistence';
import type { ListProductsPersistence } from '../ports/list-products-persistence';

export interface ListProductsInput {
  page: number;
  pageSize: number;
  search?: string;
  brandId?: string;
  categoryId?: string;
  active?: boolean;
}

export interface ListProductsOutput {
  items: PersistedProduct[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export class ListProductsUseCase {
  constructor(private readonly persistence: ListProductsPersistence) {}

  async execute(input: ListProductsInput): Promise<ListProductsOutput> {
    const result = await this.persistence.list({
      page: input.page,
      pageSize: input.pageSize,
      search: input.search?.normalize('NFKC').trim() || undefined,
      brandId: input.brandId,
      categoryId: input.categoryId,
      active: input.active,
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
