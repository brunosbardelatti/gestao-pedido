export interface ChangeOwnPasswordPersistenceInput {
  userId: string;
  newPasswordHash: string;
  requestId?: string;
}

export interface ChangeOwnPasswordPersistence {
  findPasswordHash(userId: string): Promise<string | null>;
  updatePasswordWithAudit(input: ChangeOwnPasswordPersistenceInput): Promise<void>;
}
