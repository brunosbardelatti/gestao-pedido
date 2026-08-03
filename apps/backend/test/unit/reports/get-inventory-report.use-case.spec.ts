import { describe, expect, it, vi } from 'vitest';

import type { GetInventoryReportPersistence } from '../../../src/modules/reports/application/ports/get-inventory-report-persistence';
import { GetInventoryReportUseCase } from '../../../src/modules/reports/application/use-cases/get-inventory-report.use-case';

describe('GetInventoryReportUseCase', () => {
  it('normalizes the search, forwards sorting and calculates pagination', async () => {
    const persistence: GetInventoryReportPersistence = {
      getInventory: vi.fn().mockResolvedValue({
        items: [{ productId: 'product-id', balance: 7 }],
        total: 41,
      }),
    };
    const useCase = new GetInventoryReportUseCase(persistence);

    const result = await useCase.execute({
      page: 2,
      pageSize: 20,
      search: '  Natura  ',
      sortBy: 'balance',
      sortOrder: 'desc',
    });

    expect(persistence.getInventory).toHaveBeenCalledWith({
      page: 2,
      pageSize: 20,
      search: 'Natura',
      sortBy: 'balance',
      sortOrder: 'desc',
    });
    expect(result.meta).toEqual({
      page: 2,
      pageSize: 20,
      total: 41,
      totalPages: 3,
    });
  });

  it('omits a blank search and applies the documented default order', async () => {
    const persistence: GetInventoryReportPersistence = {
      getInventory: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    };

    await new GetInventoryReportUseCase(persistence).execute({
      page: 1,
      pageSize: 20,
      search: '   ',
    });

    expect(persistence.getInventory).toHaveBeenCalledWith({
      page: 1,
      pageSize: 20,
      search: undefined,
      sortBy: 'description',
      sortOrder: 'asc',
    });
  });
});
