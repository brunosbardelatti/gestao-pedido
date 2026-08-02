import type { PersistedOrder } from '../ports/create-order-persistence';
import type {
  ListOrdersPersistence,
  OrderListStatus,
} from '../ports/list-orders-persistence';

export interface ListOrdersInput {
  page: number;
  pageSize: number;
  status?: OrderListStatus;
  brandId?: string;
  cycle?: string;
  startDate?: string;
  endDate?: string;
}

export interface ListOrdersOutput {
  items: PersistedOrder[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export class ListOrdersUseCase {
  constructor(private readonly persistence: ListOrdersPersistence) {}

  async execute(input: ListOrdersInput): Promise<ListOrdersOutput> {
    const result = await this.persistence.list({
      page: input.page,
      pageSize: input.pageSize,
      status: input.status,
      brandId: input.brandId,
      cycle: input.cycle?.normalize('NFKC').trim() || undefined,
      startDate: input.startDate,
      endDate: input.endDate,
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
