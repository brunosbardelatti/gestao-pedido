export class InvalidExpirationDateError extends Error {
  readonly code = 'INVALID_EXPIRATION_DATE';

  constructor() {
    super('A data de validade informada é inválida.');
    this.name = 'InvalidExpirationDateError';
  }
}
