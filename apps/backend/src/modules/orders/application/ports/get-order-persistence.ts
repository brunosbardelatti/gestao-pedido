import type { PersistedOrder } from './create-order-persistence';

export interface GetOrderPersistence {
  findById(orderId: string): Promise<PersistedOrder | null>;
}
