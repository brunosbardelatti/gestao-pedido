import { describe, expect, it, vi } from 'vitest';

import type { ListOrdersPersistence } from '../../../src/modules/orders/application/ports/list-orders-persistence';
import { ListOrdersUseCase } from '../../../src/modules/orders/application/use-cases/list-orders.use-case';

describe('ListOrdersUseCase', () => {
  it('normalizes the cycle, forwards filters and calculates pagination', async () => {
    const persistence: ListOrdersPersistence = {
      list: vi.fn().mockResolvedValue({
        items: [{ id: 'order-id' }],
        total: 41,
      }),
    };
    const useCase = new ListOrdersUseCase(persistence);

    const result = await useCase.execute({
      page: 2,
      pageSize: 20,
      status: 'RECEIVED',
      brandId: '26bf7359-befe-4eb9-bcc9-58fc72489be0',
      cycle: '  CICLO 10  ',
      startDate: '2026-07-01',
      endDate: '2026-07-31',
    });

    expect(persistence.list).toHaveBeenCalledWith({
      page: 2,
      pageSize: 20,
      status: 'RECEIVED',
      brandId: '26bf7359-befe-4eb9-bcc9-58fc72489be0',
      cycle: 'CICLO 10',
      startDate: '2026-07-01',
      endDate: '2026-07-31',
    });
    expect(result).toEqual({
      items: [{ id: 'order-id' }],
      meta: {
        page: 2,
        pageSize: 20,
        total: 41,
        totalPages: 3,
      },
    });
  });

  it('omits a blank cycle and optional filters', async () => {
    const persistence: ListOrdersPersistence = {
      list: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    };

    await new ListOrdersUseCase(persistence).execute({
      page: 1,
      pageSize: 20,
      cycle: '   ',
    });

    expect(persistence.list).toHaveBeenCalledWith({
      page: 1,
      pageSize: 20,
      status: undefined,
      brandId: undefined,
      cycle: undefined,
      startDate: undefined,
      endDate: undefined,
    });
  });
});
