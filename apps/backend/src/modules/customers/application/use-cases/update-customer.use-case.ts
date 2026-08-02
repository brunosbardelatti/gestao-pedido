import { CustomerCpfAlreadyExistsError } from '../../domain/errors/customer-cpf-already-exists.error';
import { CustomerNotFoundError } from '../../domain/errors/customer-not-found.error';
import { CustomerProfile } from '../../domain/value-objects/customer-profile';
import type { PersistedCustomer } from '../ports/create-customer-persistence';
import type { UpdateCustomerPersistence } from '../ports/update-customer-persistence';
import type { CreateCustomerInput } from './create-customer.use-case';

export interface UpdateCustomerInput extends CreateCustomerInput {
  customerId: string;
}

export class UpdateCustomerUseCase {
  constructor(private readonly persistence: UpdateCustomerPersistence) {}

  async execute(input: UpdateCustomerInput): Promise<PersistedCustomer> {
    const profile = CustomerProfile.create(input);
    const result = await this.persistence.updateWithAudit({
      actorId: input.actorId,
      customerId: input.customerId,
      ...profile.value,
      requestId: input.requestId,
    });

    if (result.status === 'not_found') throw new CustomerNotFoundError();
    if (result.status === 'conflict') {
      throw new CustomerCpfAlreadyExistsError();
    }
    return result.customer;
  }
}
