import type { PersistedCustomer } from '../ports/create-customer-persistence';
import type { ListCustomersPersistence } from '../ports/list-customers-persistence';

export interface ListCustomersInput {
  page: number;
  pageSize: number;
  search?: string;
  cpf?: string;
  phone?: string;
}

export interface ListCustomersOutput {
  items: PersistedCustomer[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

function normalize(value?: string): string | undefined {
  return value?.normalize('NFKC').trim() || undefined;
}

export class ListCustomersUseCase {
  constructor(private readonly persistence: ListCustomersPersistence) {}

  async execute(input: ListCustomersInput): Promise<ListCustomersOutput> {
    const result = await this.persistence.list({
      page: input.page,
      pageSize: input.pageSize,
      search: normalize(input.search),
      cpf: normalize(input.cpf),
      phone: normalize(input.phone),
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
