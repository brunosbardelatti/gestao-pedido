import { describe, expect, it, vi } from 'vitest';

import type { ListCustomersPersistence } from '../../../src/modules/customers/application/ports/list-customers-persistence';
import { ListCustomersUseCase } from '../../../src/modules/customers/application/use-cases/list-customers.use-case';

describe('ListCustomersUseCase', () => {
  it('normalizes filters and calculates pagination', async () => {
    const persistence: ListCustomersPersistence = {
      list: vi.fn().mockResolvedValue({
        items: [{ id: 'customer-id' }],
        total: 41,
      }),
    };

    const result = await new ListCustomersUseCase(persistence).execute({
      page: 2,
      pageSize: 20,
      search: '  MARIA  ',
      cpf: ' 12345678901 ',
      phone: ' 9999 ',
    });

    expect(persistence.list).toHaveBeenCalledWith({
      page: 2,
      pageSize: 20,
      search: 'MARIA',
      cpf: '12345678901',
      phone: '9999',
    });
    expect(result.meta).toEqual({
      page: 2,
      pageSize: 20,
      total: 41,
      totalPages: 3,
    });
  });

  it('omits blank optional filters', async () => {
    const persistence: ListCustomersPersistence = {
      list: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    };

    await new ListCustomersUseCase(persistence).execute({
      page: 1,
      pageSize: 20,
      search: ' ',
      phone: ' ',
    });

    expect(persistence.list).toHaveBeenCalledWith({
      page: 1,
      pageSize: 20,
      search: undefined,
      cpf: undefined,
      phone: undefined,
    });
  });
});
