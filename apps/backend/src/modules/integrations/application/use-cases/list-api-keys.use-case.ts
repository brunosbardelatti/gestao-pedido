import type {
  ApiKeySummary,
  ListApiKeysPersistence,
} from '../ports/list-api-keys-persistence';

export interface ListApiKeysInput {
  page: number;
  pageSize: number;
}

export interface ListApiKeysOutput {
  items: ApiKeySummary[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export class ListApiKeysUseCase {
  constructor(private readonly persistence: ListApiKeysPersistence) {}

  async execute(input: ListApiKeysInput): Promise<ListApiKeysOutput> {
    const result = await this.persistence.list({
      page: input.page,
      pageSize: input.pageSize,
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
