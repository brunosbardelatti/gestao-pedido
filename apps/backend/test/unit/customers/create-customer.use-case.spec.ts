import { describe, expect, it, vi } from 'vitest';

import type { CreateCustomerPersistence } from '../../../src/modules/customers/application/ports/create-customer-persistence';
import { CreateCustomerUseCase } from '../../../src/modules/customers/application/use-cases/create-customer.use-case';
import { CustomerCpfAlreadyExistsError } from '../../../src/modules/customers/domain/errors/customer-cpf-already-exists.error';
import { InvalidCustomerDataError } from '../../../src/modules/customers/domain/errors/invalid-customer-data.error';

const actorId = '55c1e5bb-4795-485b-af90-a8d25d3d94b1';
const createdAt = new Date('2026-08-02T12:00:00.000Z');

function makeSubject(
  createdCustomer: Awaited<
    ReturnType<CreateCustomerPersistence['createWithAudit']>
  > = {
    id: '26bf7359-befe-4eb9-bcc9-58fc72489be0',
    name: 'Maria da Silva',
    cpf: '12345678901',
    phone: '11999998888',
    addressLine: 'Rua das Flores, 10',
    city: 'Sao Paulo',
    state: 'SP',
    postalCode: '01001000',
    active: true,
    createdAt,
    updatedAt: createdAt,
  },
) {
  const persistence: CreateCustomerPersistence = {
    createWithAudit: vi.fn().mockResolvedValue(createdCustomer),
  };
  const useCase = new CreateCustomerUseCase(persistence);

  return { useCase, persistence };
}

describe('CreateCustomerUseCase', () => {
  it('normalizes the profile and creates an audited active customer', async () => {
    const subject = makeSubject();

    const result = await subject.useCase.execute({
      actorId,
      name: '  Maria da Silva  ',
      cpf: '12345678901',
      phone: ' 11999998888 ',
      addressLine: ' Rua das Flores, 10 ',
      city: ' Sao Paulo ',
      state: ' sp ',
      postalCode: '01001000',
      requestId: 'req-create-customer',
    });

    expect(subject.persistence.createWithAudit).toHaveBeenCalledWith({
      actorId,
      name: 'Maria da Silva',
      cpf: '12345678901',
      phone: '11999998888',
      addressLine: 'Rua das Flores, 10',
      city: 'Sao Paulo',
      state: 'SP',
      postalCode: '01001000',
      requestId: 'req-create-customer',
    });
    expect(result.id).toBe('26bf7359-befe-4eb9-bcc9-58fc72489be0');
  });

  it('normalizes blank optional fields to null', async () => {
    const subject = makeSubject();

    await subject.useCase.execute({
      actorId,
      name: 'Cliente sem contato',
      cpf: null,
      phone: '   ',
      addressLine: undefined,
      city: '',
      state: null,
      postalCode: undefined,
    });

    expect(subject.persistence.createWithAudit).toHaveBeenCalledWith({
      actorId,
      name: 'Cliente sem contato',
      cpf: null,
      phone: null,
      addressLine: null,
      city: null,
      state: null,
      postalCode: null,
      requestId: undefined,
    });
  });

  it('rejects a duplicate CPF reported by persistence', async () => {
    const subject = makeSubject(null);

    await expect(
      subject.useCase.execute({
        actorId,
        name: 'Maria',
        cpf: '12345678901',
      }),
    ).rejects.toBeInstanceOf(CustomerCpfAlreadyExistsError);
  });

  it.each([
    { name: '' },
    { name: 'a'.repeat(151) },
    { name: 'Maria', cpf: '1234567890' },
    { name: 'Maria', cpf: '1234567890a' },
    { name: 'Maria', phone: 'a'.repeat(21) },
    { name: 'Maria', addressLine: 'a'.repeat(256) },
    { name: 'Maria', city: 'a'.repeat(101) },
    { name: 'Maria', state: 'S' },
    { name: 'Maria', state: '123' },
    { name: 'Maria', postalCode: '0100100' },
  ])('rejects invalid customer data %j before persistence', async (input) => {
    const subject = makeSubject();

    await expect(
      subject.useCase.execute({ actorId, ...input }),
    ).rejects.toBeInstanceOf(InvalidCustomerDataError);
    expect(subject.persistence.createWithAudit).not.toHaveBeenCalled();
  });
});
