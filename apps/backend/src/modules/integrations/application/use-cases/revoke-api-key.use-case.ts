import type { RevokeApiKeyPersistence } from '../ports/revoke-api-key-persistence';

export interface RevokeApiKeyInput {
  apiKeyId: string;
  userId: string;
  requestId: string;
}

export class RevokeApiKeyUseCase {
  constructor(private readonly persistence: RevokeApiKeyPersistence) {}

  async execute(input: RevokeApiKeyInput): Promise<void> {
    await this.persistence.revoke({
      apiKeyId: input.apiKeyId,
      userId: input.userId,
      requestId: input.requestId,
    });
  }
}
