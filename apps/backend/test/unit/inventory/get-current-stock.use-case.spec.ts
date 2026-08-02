import { describe, expect, it, vi } from 'vitest';

import type { GetCurrentStockPersistence } from '../../../src/modules/inventory/application/ports/get-current-stock-persistence';
import { GetCurrentStockUseCase } from '../../../src/modules/inventory/application/use-cases/get-current-stock.use-case';

describe('GetCurrentStockUseCase', () => {
  it('normalizes search, forwards filters and calculates pagination', async () => {
    const persistence: GetCurrentStockPersistence = {
      listBalances: vi.fn().mockResolvedValue({
        items: [{ productId: 'product-id', balance: -2 }],
        total: 41,
      }),
    };
    const useCase = new GetCurrentStockUseCase(persistence);

    const result = await useCase.execute({
      page: 2,
      pageSize: 20,
      search: '  PERF  ',
      brandId: '26bf7359-befe-4eb9-bcc9-58fc72489be0',
      categoryId: 'bfab0010-f11e-4e5f-ad4b-a531c32b6472',
      negativeOnly: true,
    });

    expect(persistence.listBalances).toHaveBeenCalledWith({
      page: 2,
      pageSize: 20,
      search: 'PERF',
      brandId: '26bf7359-befe-4eb9-bcc9-58fc72489be0',
      categoryId: 'bfab0010-f11e-4e5f-ad4b-a531c32b6472',
      negativeOnly: true,
    });
    expect(result.meta).toEqual({
      page: 2,
      pageSize: 20,
      total: 41,
      totalPages: 3,
    });
  });

  it('omits a blank search and defaults negativeOnly to false', async () => {
    const persistence: GetCurrentStockPersistence = {
      listBalances: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    };

    await new GetCurrentStockUseCase(persistence).execute({
      page: 1,
      pageSize: 20,
      search: '   ',
    });

    expect(persistence.listBalances).toHaveBeenCalledWith({
      page: 1,
      pageSize: 20,
      search: undefined,
      brandId: undefined,
      categoryId: undefined,
      negativeOnly: false,
    });
  });
});
