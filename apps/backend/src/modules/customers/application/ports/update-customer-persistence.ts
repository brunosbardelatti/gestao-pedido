import type {
  CreateCustomerPersistenceInput,
  PersistedCustomer,
} from './create-customer-persistence';

export interface UpdateCustomerPersistenceInput
  extends CreateCustomerPersistenceInput {
  customerId: string;
}

export type UpdateCustomerPersistenceResult =
  | { status: 'updated'; customer: PersistedCustomer }
  | { status: 'not_found' }
  | { status: 'conflict' };

export interface UpdateCustomerPersistence {
  updateWithAudit(
    input: UpdateCustomerPersistenceInput,
  ): Promise<UpdateCustomerPersistenceResult>;
}
