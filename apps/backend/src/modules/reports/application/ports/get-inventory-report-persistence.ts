export type InventoryReportSort =
  | 'description'
  | 'brandName'
  | 'balance'
  | 'suggestedSalePrice';

export type ReportSortOrder = 'asc' | 'desc';

export interface InventoryReportItem {
  productId: string;
  productCode: string;
  description: string;
  brandName: string;
  balance: number;
  suggestedSalePrice?: string;
}

export interface GetInventoryReportPersistenceInput {
  page: number;
  pageSize: number;
  search?: string;
  sortBy: InventoryReportSort;
  sortOrder: ReportSortOrder;
}

export interface GetInventoryReportPersistenceResult {
  items: InventoryReportItem[];
  total: number;
}

export interface GetInventoryReportPersistence {
  getInventory(
    input: GetInventoryReportPersistenceInput,
  ): Promise<GetInventoryReportPersistenceResult>;
}
