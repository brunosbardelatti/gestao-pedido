export interface MarginReportAggregate {
  productId: string;
  productCode: string;
  description: string;
  quantitySold: number;
  revenue: string;
  cost: string;
}

export interface GetMarginReportPersistenceInput {
  page: number;
  pageSize: number;
  startDate: string;
  endDate: string;
  productId?: string;
}

export interface GetMarginReportPersistenceResult {
  items: MarginReportAggregate[];
  total: number;
}

export interface GetMarginReportPersistence {
  getMargins(
    input: GetMarginReportPersistenceInput,
  ): Promise<GetMarginReportPersistenceResult>;
}
