export interface ApiKeySummary {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  status: 'ACTIVE' | 'REVOKED';
  createdAt: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

export interface ListApiKeysPersistenceResult {
  items: ApiKeySummary[];
  total: number;
}

export interface ListApiKeysPersistenceInput {
  page: number;
  pageSize: number;
}

export interface ListApiKeysPersistence {
  list(input: ListApiKeysPersistenceInput): Promise<ListApiKeysPersistenceResult>;
}
