import { InvalidApiKeyNameError } from '../../domain/errors/invalid-api-key-name.error';
import type { ApiKeyHashService } from '../ports/api-key-hash.service';
import type { CreateApiKeyPersistence } from '../ports/create-api-key-persistence';

export interface CreateApiKeyInput {
  name: string;
  scopes: string[];
  expiresAt: string | null;
  userId: string;
  requestId: string;
}

export interface CreateApiKeyOutput {
  id: string;
  name: string;
  keyPrefix: string;
  plainTextKey: string;
  scopes: string[];
  expiresAt: string | null;
  createdAt: string;
}

export class CreateApiKeyUseCase {
  constructor(
    private readonly hashService: ApiKeyHashService,
    private readonly persistence: CreateApiKeyPersistence,
  ) {}

  async execute(input: CreateApiKeyInput): Promise<CreateApiKeyOutput> {
    const trimmed = input.name.trim();
    if (trimmed.length === 0 || trimmed.length > 120) {
      throw new InvalidApiKeyNameError();
    }

    const generated = this.hashService.generate();

    const result = await this.persistence.create({
      name: trimmed,
      keyPrefix: generated.prefix,
      keyHash: generated.hash,
      scopes: input.scopes,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      createdById: input.userId,
      requestId: input.requestId,
    });

    return {
      ...result,
      plainTextKey: generated.plainText,
    };
  }
}
