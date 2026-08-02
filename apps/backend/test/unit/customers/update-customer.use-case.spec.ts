import { describe, expect, it, vi } from 'vitest';

import type { UpdateCustomerPersistence } from '../../../src/modules/customers/application/ports/update-customer-persistence';
import { UpdateCustomerUseCase } from '../../../src/modules/customers/application/use-cases/update-customer.use-case';
import { CustomerCpfAlreadyExistsError } from '../../../src/modules/customers/domain/errors/customer-cpf-already-exists.error';
import { CustomerNotFoundError } from '../../../src/modules/customers/domain/errors/customer-not-found.error';
import { InvalidCustomerDataError } from '../../../src/modules/customers/domain/errors/invalid-customer-data.error';

const actorId = '55c1e5bb-4795-485b-af90-a8d25d3d94b1';
const customerId = '26bf7359-befe-4eb9-bcc9-58fc72489be0';
const updatedAt = new Date('2026-08-02T13:00:00.000Z');

function makeSubject(
  result: Awaited<ReturnType<UpdateCustomerPersistence['updateWithAudit']>> = {
    status: 'updated',
    customer: {
      id: customerId,
      name: 'Maria Atualizada',
      cpf: null,
      phone: '11988887777',
      addressLine: null,
      city: 'Campinas',
      state: 'SP',
      postalCode: null,
      active: true,
      createdAt: new Date('2026-08-02T12:00:00.000Z'),
      updatedAt,
    },
  },
) {
  const persistence: UpdateCustomerPersistence = {
    updateWithAudit: vi.fn().mockResolvedValue(result),
  };
  return {
    useCase: new UpdateCustomerUseCase(persistence),
    persistence,
  };
}

describe('UpdateCustomerUseCase', () => {
  it('normalizes and replaces the complete customer profile', async () => {
    const subject = makeSubject();

    const result = await subject.useCase.execute({
      actorId,
      customerId,
      name: ' Maria Atualizada ',
      cpf: null,
      phone: ' 11988887777 ',
      city: ' Campinas ',
      state: 'sp',
      requestId: 'req-update-customer',
    });

    expect(subject.persistence.updateWithAudit).toHaveBeenCalledWith({
      actorId,
      customerId,
      name: 'Maria Atualizada',
      cpf: null,
      phone: '11988887777',
      addressLine: null,
      city: 'Campinas',
      state: 'SP',
      postalCode: null,
      requestId: 'req-update-customer',
    });
    expect(result.name).toBe('Maria Atualizada');
  });

  it('rejects an unknown customer', async () => {
    const subject = makeSubject({ status: 'not_found' });

    await expect(
      subject.useCase.execute({ actorId, customerId, name: 'Maria' }),
    ).rejects.toBeInstanceOf(CustomerNotFoundError);
  });

  it('rejects a CPF already assigned to another customer', async () => {
    const subject = makeSubject({ status: 'conflict' });

    await expect(
      subject.useCase.execute({
        actorId,
        customerId,
        name: 'Maria',
        cpf: '12345678901',
      }),
    ).rejects.toBeInstanceOf(CustomerCpfAlreadyExistsError);
  });

  it('rejects invalid data before persistence', async () => {
    const subject = makeSubject();

    await expect(
      subject.useCase.execute({ actorId, customerId, name: '   ' }),
    ).rejects.toBeInstanceOf(InvalidCustomerDataError);
    expect(subject.persistence.updateWithAudit).not.toHaveBeenCalled();
  });
});
