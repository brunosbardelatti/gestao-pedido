import type { PersistedBrand } from './create-brand-persistence';

export interface UpdateBrandPersistenceInput {
  actorId: string;
  brandId: string;
  name: string;
  normalizedName: string;
  requestId?: string;
}

export type UpdateBrandPersistenceResult =
  | { status: 'updated'; brand: PersistedBrand }
  | { status: 'not_found' }
  | { status: 'conflict' };

export interface UpdateBrandPersistence {
  updateWithAudit(
    input: UpdateBrandPersistenceInput,
  ): Promise<UpdateBrandPersistenceResult>;
}
