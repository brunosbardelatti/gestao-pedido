import { CustomerCpfAlreadyExistsError } from '../../domain/errors/customer-cpf-already-exists.error';
import { CustomerProfile } from '../../domain/value-objects/customer-profile';
import type {
  CreateCustomerPersistence,
  PersistedCustomer,
} from '../ports/create-customer-persistence';

export interface CreateCustomerInput {
  actorId: string;
  name: string;
  cpf?: string | null;
  phone?: string | null;
  addressLine?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  requestId?: string;
}

export type CreateCustomerOutput = PersistedCustomer;

export class CreateCustomerUseCase {
  constructor(private readonly persistence: CreateCustomerPersistence) {}

  async execute(input: CreateCustomerInput): Promise<CreateCustomerOutput> {
    const profile = CustomerProfile.create(input);
    const customer = await this.persistence.createWithAudit({
      actorId: input.actorId,
      ...profile.value,
      requestId: input.requestId,
    });

    if (!customer) {
      throw new CustomerCpfAlreadyExistsError();
    }

    return customer;
  }
}
