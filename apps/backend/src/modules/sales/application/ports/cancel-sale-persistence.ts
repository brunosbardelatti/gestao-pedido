import type { PersistedSale } from './create-sale-persistence';

export interface CancelSalePersistenceInput {
  actorId: string;
  saleId: string;
  idempotencyKey: string;
  idempotencyScope: string;
  requestHash: string;
  reason: string;
  requestId?: string;
}

export type CancelSalePersistenceResult =
  | { status: 'canceled' | 'replayed'; sale: PersistedSale }
  | { status: 'not_found' }
  | { status: 'not_cancelable' }
  | { status: 'idempotency_conflict' }
  | { status: 'idempotency_in_progress' };

export interface CancelSalePersistence {
  cancelIdempotently(
    input: CancelSalePersistenceInput,
  ): Promise<CancelSalePersistenceResult>;
}
