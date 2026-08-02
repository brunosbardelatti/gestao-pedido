import type { PersistedOrder } from './create-order-persistence';

export interface CancelOrderPersistenceInput {
  actorId: string;
  orderId: string;
  reason: string;
  requestId?: string;
}

export type CancelOrderPersistenceResult =
  | { status: 'canceled'; order: PersistedOrder }
  | { status: 'not_found' }
  | { status: 'not_cancelable' };

export interface CancelOrderPersistence {
  cancelWithAudit(
    input: CancelOrderPersistenceInput,
  ): Promise<CancelOrderPersistenceResult>;
}
