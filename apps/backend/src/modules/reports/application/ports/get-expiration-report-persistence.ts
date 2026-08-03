export interface ExpirationReportAggregate {
  orderItemId: string;
  productId: string;
  productCode: string;
  description: string;
  expirationDate: string;
  quantityReceived: number;
}

export interface GetExpirationReportPersistenceInput {
  page: number;
  pageSize: number;
  fromDate: string;
  toDate: string;
}

export interface GetExpirationReportPersistenceResult {
  items: ExpirationReportAggregate[];
  total: number;
}

export interface GetExpirationReportPersistence {
  getExpirations(
    input: GetExpirationReportPersistenceInput,
  ): Promise<GetExpirationReportPersistenceResult>;
}
