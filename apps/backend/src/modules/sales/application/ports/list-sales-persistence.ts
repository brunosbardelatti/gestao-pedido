import type { PersistedSale } from './create-sale-persistence';

export type SaleListStatus = 'COMPLETED' | 'CANCELED';

export interface ListSalesPersistenceInput {
  page: number;
  pageSize: number;
  status?: SaleListStatus;
  customerId?: string;
  startDate?: string;
  endDate?: string;
}

export interface ListSalesPersistenceResult {
  items: PersistedSale[];
  total: number;
}

export interface ListSalesPersistence {
  list(input: ListSalesPersistenceInput): Promise<ListSalesPersistenceResult>;
}
