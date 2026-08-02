export interface CreateLoginSessionInput {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface LoginPersistence {
  createSessionWithAudit(input: CreateLoginSessionInput): Promise<void>;
}
