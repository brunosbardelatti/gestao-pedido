import type { PersistedProduct } from './create-product-persistence';

export interface SetProductActivePersistenceInput {
  actorId: string;
  productId: string;
  active: boolean;
  requestId?: string;
}

export type SetProductActivePersistenceResult =
  | { status: 'updated'; product: PersistedProduct }
  | { status: 'not_found' };

export interface SetProductActivePersistence {
  setActiveWithAudit(
    input: SetProductActivePersistenceInput,
  ): Promise<SetProductActivePersistenceResult>;
}
