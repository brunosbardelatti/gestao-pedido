import type {
  GetCurrentStockPersistence,
  InventoryBalance,
} from '../ports/get-current-stock-persistence';

export interface GetCurrentStockInput {
  page: number;
  pageSize: number;
  search?: string;
  brandId?: string;
  categoryId?: string;
  negativeOnly?: boolean;
}

export interface GetCurrentStockOutput {
  items: InventoryBalance[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export class GetCurrentStockUseCase {
  constructor(private readonly persistence: GetCurrentStockPersistence) {}

  async execute(input: GetCurrentStockInput): Promise<GetCurrentStockOutput> {
    const result = await this.persistence.listBalances({
      page: input.page,
      pageSize: input.pageSize,
      search: input.search?.normalize('NFKC').trim() || undefined,
      brandId: input.brandId,
      categoryId: input.categoryId,
      negativeOnly: input.negativeOnly ?? false,
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
