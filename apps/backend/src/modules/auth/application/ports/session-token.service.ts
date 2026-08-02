export interface GeneratedSessionToken {
  plainText: string;
  hash: string;
}

export interface SessionTokenService {
  generate(): GeneratedSessionToken;
  hash(plainText: string): string;
}
