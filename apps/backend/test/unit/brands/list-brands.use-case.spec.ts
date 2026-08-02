import { describe, expect, it, vi } from 'vitest';

import type { ListBrandsPersistence } from '../../../src/modules/brands/application/ports/list-brands-persistence';
import { ListBrandsUseCase } from '../../../src/modules/brands/application/use-cases/list-brands.use-case';

describe('ListBrandsUseCase', () => {
  it('normalizes search and returns pagination metadata', async () => {
    const createdAt = new Date('2026-08-02T12:00:00.000Z');
    const persistence: ListBrandsPersistence = {
      list: vi.fn().mockResolvedValue({
        items: [
          {
            id: '26bf7359-befe-4eb9-bcc9-58fc72489be0',
            name: 'Natura',
            active: true,
            createdAt,
            updatedAt: createdAt,
          },
        ],
        total: 21,
      }),
    };
    const useCase = new ListBrandsUseCase(persistence);

    const result = await useCase.execute({
      page: 2,
      pageSize: 10,
      search: '  Natura  ',
    });

    expect(persistence.list).toHaveBeenCalledWith({
      page: 2,
      pageSize: 10,
      search: 'Natura',
    });
    expect(result.meta).toEqual({
      page: 2,
      pageSize: 10,
      total: 21,
      totalPages: 3,
    });
    expect(result.items).toHaveLength(1);
  });
});
