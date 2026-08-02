export interface PersistedCustomer {
  id: string;
  name: string;
  cpf: string | null;
  phone: string | null;
  addressLine: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCustomerPersistenceInput {
  actorId: string;
  name: string;
  cpf: string | null;
  phone: string | null;
  addressLine: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  requestId?: string;
}

export interface CreateCustomerPersistence {
  createWithAudit(
    input: CreateCustomerPersistenceInput,
  ): Promise<PersistedCustomer | null>;
}
