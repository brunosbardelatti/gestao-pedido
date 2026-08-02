import type { PersistedSale } from '../ports/create-sale-persistence';
import type {
  ListSalesPersistence,
  ListSalesPersistenceInput,
} from '../ports/list-sales-persistence';

export interface ListSalesOutput {
  items: PersistedSale[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export class ListSalesUseCase {
  constructor(private readonly persistence: ListSalesPersistence) {}

  async execute(input: ListSalesPersistenceInput): Promise<ListSalesOutput> {
    const result = await this.persistence.list(input);
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
