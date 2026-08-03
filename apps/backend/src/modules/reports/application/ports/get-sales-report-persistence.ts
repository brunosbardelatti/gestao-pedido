export interface GetSalesReportPersistenceInput {
  startDate: string;
  endDate: string;
  includeCanceled: boolean;
}

export interface SalesReportTotals {
  salesCount: number;
  itemsCount: number;
  revenue: string;
}

export interface GetSalesReportPersistence {
  getSalesTotals(
    input: GetSalesReportPersistenceInput,
  ): Promise<SalesReportTotals>;
}
