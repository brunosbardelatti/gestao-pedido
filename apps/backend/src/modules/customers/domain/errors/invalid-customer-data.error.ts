export class InvalidCustomerDataError extends Error {
  readonly code = 'INVALID_CUSTOMER_DATA';

  constructor() {
    super('Os dados do cliente são inválidos.');
    this.name = 'InvalidCustomerDataError';
  }
}
