import type { PersistedOrder } from './create-order-persistence';

export type OrderListStatus = 'OPEN' | 'RECEIVED' | 'CANCELED';

export interface ListOrdersPersistenceInput {
  page: number;
  pageSize: number;
  status?: OrderListStatus;
  brandId?: string;
  cycle?: string;
  startDate?: string;
  endDate?: string;
}

export interface ListOrdersPersistenceResult {
  items: PersistedOrder[];
  total: number;
}

export interface ListOrdersPersistence {
  list(input: ListOrdersPersistenceInput): Promise<ListOrdersPersistenceResult>;
}
