import type { PersistedCategory } from './create-category-persistence';

export interface UpdateCategoryPersistenceInput {
  actorId: string;
  categoryId: string;
  name: string;
  normalizedName: string;
  requestId?: string;
}

export type UpdateCategoryPersistenceResult =
  | { status: 'updated'; category: PersistedCategory }
  | { status: 'not_found' }
  | { status: 'conflict' };

export interface UpdateCategoryPersistence {
  updateWithAudit(
    input: UpdateCategoryPersistenceInput,
  ): Promise<UpdateCategoryPersistenceResult>;
}
