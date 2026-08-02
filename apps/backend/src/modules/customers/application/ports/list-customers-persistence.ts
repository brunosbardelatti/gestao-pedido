import type { PersistedCustomer } from './create-customer-persistence';

export interface ListCustomersPersistenceInput {
  page: number;
  pageSize: number;
  search?: string;
  cpf?: string;
  phone?: string;
}

export interface ListCustomersPersistenceResult {
  items: PersistedCustomer[];
  total: number;
}

export interface ListCustomersPersistence {
  list(
    input: ListCustomersPersistenceInput,
  ): Promise<ListCustomersPersistenceResult>;
}
