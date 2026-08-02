import type { AuthUser } from '../entities/auth-user';

export interface UserRepository {
  findByNormalizedLogin(normalizedLogin: string): Promise<AuthUser | null>;
}
