export interface GeneratedApiKey {
  plainText: string;
  prefix: string;
  hash: string;
}

export interface ApiKeyHashService {
  generate(): GeneratedApiKey;
  hash(plainText: string): string;
}
