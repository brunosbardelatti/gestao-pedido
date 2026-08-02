import type { PersistedCategory } from './create-category-persistence';

export interface SetCategoryActivePersistenceInput {
  actorId: string;
  categoryId: string;
  active: boolean;
  requestId?: string;
}

export type SetCategoryActivePersistenceResult =
  | { status: 'updated'; category: PersistedCategory }
  | { status: 'not_found' };

export interface SetCategoryActivePersistence {
  setActiveWithAudit(
    input: SetCategoryActivePersistenceInput,
  ): Promise<SetCategoryActivePersistenceResult>;
}
