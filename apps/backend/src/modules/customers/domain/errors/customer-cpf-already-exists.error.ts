export class CustomerCpfAlreadyExistsError extends Error {
  readonly code = 'CUSTOMER_CPF_ALREADY_EXISTS';

  constructor() {
    super('Já existe um cliente com este CPF.');
    this.name = 'CustomerCpfAlreadyExistsError';
  }
}
