import type { PersistedOrder } from './create-order-persistence';

export interface ReceiveOrderPersistenceItemInput {
  orderItemId: string;
  quantityReceived: number;
  expirationDate: string | null;
  notes: string | null;
}

export interface ReceiveOrderPersistenceInput {
  actorId: string;
  orderId: string;
  idempotencyKey: string;
  idempotencyScope: string;
  requestHash: string;
  items: ReceiveOrderPersistenceItemInput[];
  requestId?: string;
}

export type ReceiveOrderPersistenceResult =
  | { status: 'received'; order: PersistedOrder }
  | { status: 'replayed'; order: PersistedOrder }
  | { status: 'not_found' }
  | { status: 'not_receivable' }
  | { status: 'items_mismatch' }
  | { status: 'quantity_exceeded' }
  | { status: 'idempotency_conflict' }
  | { status: 'idempotency_in_progress' };

export interface ReceiveOrderPersistence {
  receiveIdempotently(
    input: ReceiveOrderPersistenceInput,
  ): Promise<ReceiveOrderPersistenceResult>;
}
