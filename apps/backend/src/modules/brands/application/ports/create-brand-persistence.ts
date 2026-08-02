export interface CreateBrandPersistenceInput {
  actorId: string;
  name: string;
  normalizedName: string;
  requestId?: string;
}

export interface PersistedBrand {
  id: string;
  name: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBrandPersistence {
  createWithAudit(
    input: CreateBrandPersistenceInput,
  ): Promise<PersistedBrand | null>;
}
