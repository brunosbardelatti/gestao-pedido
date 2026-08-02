export interface CreateCategoryPersistenceInput {
  actorId: string;
  name: string;
  normalizedName: string;
  requestId?: string;
}

export interface PersistedCategory {
  id: string;
  name: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCategoryPersistence {
  createWithAudit(
    input: CreateCategoryPersistenceInput,
  ): Promise<PersistedCategory | null>;
}
