import type {
  GetInventoryReportPersistence,
  InventoryReportItem,
  InventoryReportSort,
  ReportSortOrder,
} from '../ports/get-inventory-report-persistence';

export interface GetInventoryReportInput {
  page: number;
  pageSize: number;
  search?: string;
  sortBy?: InventoryReportSort;
  sortOrder?: ReportSortOrder;
}

export interface GetInventoryReportOutput {
  items: InventoryReportItem[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export class GetInventoryReportUseCase {
  constructor(private readonly persistence: GetInventoryReportPersistence) {}

  async execute(
    input: GetInventoryReportInput,
  ): Promise<GetInventoryReportOutput> {
    const result = await this.persistence.getInventory({
      page: input.page,
      pageSize: input.pageSize,
      search: input.search?.normalize('NFKC').trim() || undefined,
      sortBy: input.sortBy ?? 'description',
      sortOrder: input.sortOrder ?? 'asc',
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
