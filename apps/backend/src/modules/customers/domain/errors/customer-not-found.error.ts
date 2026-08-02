export class CustomerNotFoundError extends Error {
  readonly code = 'CUSTOMER_NOT_FOUND';

  constructor() {
    super('Cliente não encontrado.');
    this.name = 'CustomerNotFoundError';
  }
}
