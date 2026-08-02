import { describe, expect, it, vi } from 'vitest';

import type { ListCategoriesPersistence } from '../../../src/modules/categories/application/ports/list-categories-persistence';
import { ListCategoriesUseCase } from '../../../src/modules/categories/application/use-cases/list-categories.use-case';

describe('ListCategoriesUseCase', () => {
  it('normalizes search and returns pagination metadata', async () => {
    const createdAt = new Date('2026-08-02T12:00:00.000Z');
    const persistence: ListCategoriesPersistence = {
      list: vi.fn().mockResolvedValue({
        items: [
          {
            id: '26bf7359-befe-4eb9-bcc9-58fc72489be0',
            name: 'Perfumaria',
            active: true,
            createdAt,
            updatedAt: createdAt,
          },
        ],
        total: 1,
      }),
    };
    const useCase = new ListCategoriesUseCase(persistence);

    const result = await useCase.execute({
      page: 1,
      pageSize: 100,
      search: '  Perfumaria  ',
    });

    expect(persistence.list).toHaveBeenCalledWith({
      page: 1,
      pageSize: 100,
      search: 'Perfumaria',
    });
    expect(result.meta).toEqual({
      page: 1,
      pageSize: 100,
      total: 1,
      totalPages: 1,
    });
    expect(result.items).toHaveLength(1);
  });
});
