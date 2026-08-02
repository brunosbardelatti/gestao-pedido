import { describe, expect, it, vi } from 'vitest';

import type { ListInventoryMovementsPersistence } from '../../../src/modules/inventory/application/ports/list-inventory-movements-persistence';
import { ListInventoryMovementsUseCase } from '../../../src/modules/inventory/application/use-cases/list-inventory-movements.use-case';

describe('ListInventoryMovementsUseCase', () => {
  it('forwards filters and calculates pagination', async () => {
    const persistence: ListInventoryMovementsPersistence = {
      list: vi.fn().mockResolvedValue({
        items: [{ id: 'movement-id' }],
        total: 41,
      }),
    };
    const useCase = new ListInventoryMovementsUseCase(persistence);

    const result = await useCase.execute({
      page: 2,
      pageSize: 20,
      productId: '26bf7359-befe-4eb9-bcc9-58fc72489be0',
      type: 'PURCHASE',
      startDate: '2026-07-01',
      endDate: '2026-07-31',
    });

    expect(persistence.list).toHaveBeenCalledWith({
      page: 2,
      pageSize: 20,
      productId: '26bf7359-befe-4eb9-bcc9-58fc72489be0',
      type: 'PURCHASE',
      startDate: '2026-07-01',
      endDate: '2026-07-31',
    });
    expect(result.meta).toEqual({
      page: 2,
      pageSize: 20,
      total: 41,
      totalPages: 3,
    });
  });

  it('forwards absent optional filters', async () => {
    const persistence: ListInventoryMovementsPersistence = {
      list: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    };

    await new ListInventoryMovementsUseCase(persistence).execute({
      page: 1,
      pageSize: 20,
    });

    expect(persistence.list).toHaveBeenCalledWith({
      page: 1,
      pageSize: 20,
      productId: undefined,
      type: undefined,
      startDate: undefined,
      endDate: undefined,
    });
  });
});
