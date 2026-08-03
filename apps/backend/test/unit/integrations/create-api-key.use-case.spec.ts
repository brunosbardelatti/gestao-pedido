import { describe, expect, it, vi } from 'vitest';

import type { ApiKeyHashService } from '../../../src/modules/integrations/application/ports/api-key-hash.service';
import type { CreateApiKeyPersistence } from '../../../src/modules/integrations/application/ports/create-api-key-persistence';
import { CreateApiKeyUseCase } from '../../../src/modules/integrations/application/use-cases/create-api-key.use-case';
import { InvalidApiKeyNameError } from '../../../src/modules/integrations/domain/errors/invalid-api-key-name.error';

describe('CreateApiKeyUseCase', () => {
  const hashService: ApiKeyHashService = {
    generate: vi.fn().mockReturnValue({
      plainText: 'abc123_full_key_value',
      prefix: 'abc123_f',
      hash: 'sha256hash',
    }),
    hash: vi.fn(),
  };

  it('creates an API key with a trimmed name and returns the plain text key', async () => {
    const persistence: CreateApiKeyPersistence = {
      create: vi.fn().mockResolvedValue({
        id: 'key-id',
        name: 'Integração ERP',
        keyPrefix: 'abc123_f',
        scopes: [],
        expiresAt: null,
        createdAt: '2026-08-02T00:00:00.000Z',
      }),
    };

    const useCase = new CreateApiKeyUseCase(hashService, persistence);
    const result = await useCase.execute({
      name: '  Integração ERP  ',
      scopes: [],
      expiresAt: null,
      userId: 'user-id',
      requestId: 'req-id',
    });

    expect(persistence.create).toHaveBeenCalledWith({
      name: 'Integração ERP',
      keyPrefix: 'abc123_f',
      keyHash: 'sha256hash',
      scopes: [],
      expiresAt: null,
      createdById: 'user-id',
      requestId: 'req-id',
    });
    expect(result.plainTextKey).toBe('abc123_full_key_value');
    expect(result.id).toBe('key-id');
  });

  it('rejects an empty name', async () => {
    const persistence: CreateApiKeyPersistence = { create: vi.fn() };
    const useCase = new CreateApiKeyUseCase(hashService, persistence);

    await expect(
      useCase.execute({
        name: '   ',
        scopes: [],
        expiresAt: null,
        userId: 'user-id',
        requestId: 'req-id',
      }),
    ).rejects.toBeInstanceOf(InvalidApiKeyNameError);
    expect(persistence.create).not.toHaveBeenCalled();
  });

  it('rejects a name longer than 120 characters', async () => {
    const persistence: CreateApiKeyPersistence = { create: vi.fn() };
    const useCase = new CreateApiKeyUseCase(hashService, persistence);

    await expect(
      useCase.execute({
        name: 'a'.repeat(121),
        scopes: [],
        expiresAt: null,
        userId: 'user-id',
        requestId: 'req-id',
      }),
    ).rejects.toBeInstanceOf(InvalidApiKeyNameError);
  });

  it('passes scopes and expiration through to persistence', async () => {
    const persistence: CreateApiKeyPersistence = {
      create: vi.fn().mockResolvedValue({
        id: 'key-id',
        name: 'ERP',
        keyPrefix: 'abc123_f',
        scopes: ['orders:read'],
        expiresAt: '2027-01-01T00:00:00.000Z',
        createdAt: '2026-08-02T00:00:00.000Z',
      }),
    };
    const useCase = new CreateApiKeyUseCase(hashService, persistence);

    await useCase.execute({
      name: 'ERP',
      scopes: ['orders:read'],
      expiresAt: '2027-01-01T00:00:00.000Z',
      userId: 'user-id',
      requestId: 'req-id',
    });

    expect(persistence.create).toHaveBeenCalledWith(
      expect.objectContaining({
        scopes: ['orders:read'],
        expiresAt: new Date('2027-01-01T00:00:00.000Z'),
      }),
    );
  });
});
