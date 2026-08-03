export interface RevokeApiKeyPersistenceInput {
  apiKeyId: string;
  requestId: string;
  userId: string;
}

export interface RevokeApiKeyPersistence {
  revoke(input: RevokeApiKeyPersistenceInput): Promise<void>;
}
