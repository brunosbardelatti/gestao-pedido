import { describe, expect, it, vi } from 'vitest';

import type { ListSalesPersistence } from '../../../src/modules/sales/application/ports/list-sales-persistence';
import { ListSalesUseCase } from '../../../src/modules/sales/application/use-cases/list-sales.use-case';

describe('ListSalesUseCase', () => {
  it('forwards filters and calculates pagination', async () => {
    const persistence: ListSalesPersistence = {
      list: vi.fn().mockResolvedValue({ items: [{ id: 'sale-id' }], total: 41 }),
    };
    const useCase = new ListSalesUseCase(persistence);
    const input = {
      page: 2,
      pageSize: 20,
      status: 'CANCELED' as const,
      customerId: '26bf7359-befe-4eb9-bcc9-58fc72489be0',
      startDate: '2026-07-01',
      endDate: '2026-07-31',
    };

    const result = await useCase.execute(input);

    expect(persistence.list).toHaveBeenCalledWith(input);
    expect(result).toEqual({
      items: [{ id: 'sale-id' }],
      meta: { page: 2, pageSize: 20, total: 41, totalPages: 3 },
    });
  });
});
