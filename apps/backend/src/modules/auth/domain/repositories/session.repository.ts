import type { AuthUser } from '../entities/auth-user';

export interface SessionRepository {
  findUserByActiveSession(
    tokenHash: string,
    now: Date,
  ): Promise<AuthUser | null>;
}
