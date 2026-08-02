export interface ResetPasswordPersistenceInput {
  actorId: string;
  targetUserId: string;
  passwordHash: string;
  requestId?: string;
}

export interface ResetPasswordPersistence {
  resetPasswordWithAudit(
    input: ResetPasswordPersistenceInput,
  ): Promise<boolean>;
}
