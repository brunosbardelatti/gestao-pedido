import { describe, expect, it, vi } from 'vitest';

import type { GetCustomerPersistence } from '../../../src/modules/customers/application/ports/get-customer-persistence';
import { GetCustomerUseCase } from '../../../src/modules/customers/application/use-cases/get-customer.use-case';
import { CustomerNotFoundError } from '../../../src/modules/customers/domain/errors/customer-not-found.error';

const customer = {
  id: '26bf7359-befe-4eb9-bcc9-58fc72489be0',
  name: 'Maria',
  cpf: null,
  phone: null,
  addressLine: null,
  city: null,
  state: null,
  postalCode: null,
  active: true,
  createdAt: new Date('2026-08-02T12:00:00.000Z'),
  updatedAt: new Date('2026-08-02T12:00:00.000Z'),
};

describe('GetCustomerUseCase', () => {
  it('returns an existing customer', async () => {
    const persistence: GetCustomerPersistence = {
      findById: vi.fn().mockResolvedValue(customer),
    };

    await expect(
      new GetCustomerUseCase(persistence).execute(customer.id),
    ).resolves.toEqual(customer);
  });

  it('rejects an unknown customer', async () => {
    const persistence: GetCustomerPersistence = {
      findById: vi.fn().mockResolvedValue(null),
    };

    await expect(
      new GetCustomerUseCase(persistence).execute(customer.id),
    ).rejects.toBeInstanceOf(CustomerNotFoundError);
  });
});
