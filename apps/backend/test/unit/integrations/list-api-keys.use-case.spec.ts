import { describe, expect, it, vi } from 'vitest';

import type { ListApiKeysPersistence } from '../../../src/modules/integrations/application/ports/list-api-keys-persistence';
import { ListApiKeysUseCase } from '../../../src/modules/integrations/application/use-cases/list-api-keys.use-case';

describe('ListApiKeysUseCase', () => {
  it('returns items with pagination metadata', async () => {
    const persistence: ListApiKeysPersistence = {
      list: vi.fn().mockResolvedValue({
        items: [
          {
            id: 'key-1',
            name: 'ERP',
            keyPrefix: 'abc123_f',
            scopes: [],
            status: 'ACTIVE',
            createdAt: '2026-08-02T00:00:00.000Z',
            expiresAt: null,
            lastUsedAt: null,
            revokedAt: null,
          },
        ],
        total: 1,
      }),
    };
    const useCase = new ListApiKeysUseCase(persistence);

    const result = await useCase.execute({ page: 1, pageSize: 20 });

    expect(result.items).toHaveLength(1);
    expect(result.meta).toEqual({
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    });
  });

  it('calculates totalPages correctly for multiple pages', async () => {
    const persistence: ListApiKeysPersistence = {
      list: vi.fn().mockResolvedValue({ items: [], total: 45 }),
    };
    const useCase = new ListApiKeysUseCase(persistence);

    const result = await useCase.execute({ page: 1, pageSize: 20 });

    expect(result.meta.totalPages).toBe(3);
  });
});
