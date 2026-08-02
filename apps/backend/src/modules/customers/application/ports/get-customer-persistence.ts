import type { PersistedCustomer } from './create-customer-persistence';

export interface GetCustomerPersistence {
  findById(customerId: string): Promise<PersistedCustomer | null>;
}
