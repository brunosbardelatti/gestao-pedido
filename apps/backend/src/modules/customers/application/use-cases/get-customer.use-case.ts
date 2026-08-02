import { CustomerNotFoundError } from '../../domain/errors/customer-not-found.error';
import type { PersistedCustomer } from '../ports/create-customer-persistence';
import type { GetCustomerPersistence } from '../ports/get-customer-persistence';

export class GetCustomerUseCase {
  constructor(private readonly persistence: GetCustomerPersistence) {}

  async execute(customerId: string): Promise<PersistedCustomer> {
    const customer = await this.persistence.findById(customerId);
    if (!customer) throw new CustomerNotFoundError();
    return customer;
  }
}
