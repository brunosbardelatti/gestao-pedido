import type { PersistedBrand } from './create-brand-persistence';

export interface SetBrandActivePersistenceInput {
  actorId: string;
  brandId: string;
  active: boolean;
  requestId?: string;
}

export type SetBrandActivePersistenceResult =
  | { status: 'updated'; brand: PersistedBrand }
  | { status: 'not_found' };

export interface SetBrandActivePersistence {
  setActiveWithAudit(
    input: SetBrandActivePersistenceInput,
  ): Promise<SetBrandActivePersistenceResult>;
}
