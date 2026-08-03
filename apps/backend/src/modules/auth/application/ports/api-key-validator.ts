export interface ApiKeyIdentity {
  apiKeyId: string;
  name: string;
  scopes: string[];
}

export interface ApiKeyValidator {
  validate(plainTextKey: string, now: Date): Promise<ApiKeyIdentity | null>;
}
