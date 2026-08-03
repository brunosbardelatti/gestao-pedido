import { describe, expect, it, vi } from 'vitest';

import type { RevokeApiKeyPersistence } from '../../../src/modules/integrations/application/ports/revoke-api-key-persistence';
import { RevokeApiKeyUseCase } from '../../../src/modules/integrations/application/use-cases/revoke-api-key.use-case';

describe('RevokeApiKeyUseCase', () => {
  it('delegates revocation to the persistence layer', async () => {
    const persistence: RevokeApiKeyPersistence = {
      revoke: vi.fn().mockResolvedValue(undefined),
    };
    const useCase = new RevokeApiKeyUseCase(persistence);

    await useCase.execute({
      apiKeyId: 'key-id',
      userId: 'user-id',
      requestId: 'req-id',
    });

    expect(persistence.revoke).toHaveBeenCalledWith({
      apiKeyId: 'key-id',
      userId: 'user-id',
      requestId: 'req-id',
    });
  });
});
