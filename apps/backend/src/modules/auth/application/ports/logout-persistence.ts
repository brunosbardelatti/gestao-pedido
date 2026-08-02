export type LogoutPersistenceResult =
  | 'REVOKED'
  | 'ALREADY_REVOKED'
  | 'NOT_FOUND';

export interface RevokeSessionInput {
  tokenHash: string;
  revokedAt: Date;
  requestId?: string;
}

export interface LogoutPersistence {
  revokeSessionWithAudit(
    input: RevokeSessionInput,
  ): Promise<LogoutPersistenceResult>;
}
