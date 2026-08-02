export interface PasswordHasher {
  verify(hash: string, plainText: string): Promise<boolean>;
}
