import { describe, expect, it, vi } from 'vitest';

import type { ListProductsPersistence } from '../../../src/modules/products/application/ports/list-products-persistence';
import { ListProductsUseCase } from '../../../src/modules/products/application/use-cases/list-products.use-case';

describe('ListProductsUseCase', () => {
  it('normalizes search, forwards filters and calculates pagination', async () => {
    const persistence: ListProductsPersistence = {
      list: vi.fn().mockResolvedValue({
        items: [{ id: 'product-id' }],
        total: 41,
      }),
    };
    const useCase = new ListProductsUseCase(persistence);

    const result = await useCase.execute({
      page: 2,
      pageSize: 20,
      search: '  PERF  ',
      brandId: '26bf7359-befe-4eb9-bcc9-58fc72489be0',
      categoryId: 'bfab0010-f11e-4e5f-ad4b-a531c32b6472',
      active: false,
    });

    expect(persistence.list).toHaveBeenCalledWith({
      page: 2,
      pageSize: 20,
      search: 'PERF',
      brandId: '26bf7359-befe-4eb9-bcc9-58fc72489be0',
      categoryId: 'bfab0010-f11e-4e5f-ad4b-a531c32b6472',
      active: false,
    });
    expect(result).toEqual({
      items: [{ id: 'product-id' }],
      meta: {
        page: 2,
        pageSize: 20,
        total: 41,
        totalPages: 3,
      },
    });
  });

  it('omits a blank search without imposing an active filter', async () => {
    const persistence: ListProductsPersistence = {
      list: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    };

    await new ListProductsUseCase(persistence).execute({
      page: 1,
      pageSize: 20,
      search: '   ',
    });

    expect(persistence.list).toHaveBeenCalledWith({
      page: 1,
      pageSize: 20,
      search: undefined,
      brandId: undefined,
      categoryId: undefined,
      active: undefined,
    });
  });
});
