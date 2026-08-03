export interface CreateApiKeyPersistenceInput {
  name: string;
  keyPrefix: string;
  keyHash: string;
  scopes: string[];
  expiresAt: Date | null;
  createdById: string;
  requestId: string;
}

export interface CreateApiKeyPersistenceResult {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  expiresAt: string | null;
  createdAt: string;
}

export interface CreateApiKeyPersistence {
  create(
    input: CreateApiKeyPersistenceInput,
  ): Promise<CreateApiKeyPersistenceResult>;
}
