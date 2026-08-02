export class InvalidProductCodeError extends Error {
  readonly code = 'INVALID_PRODUCT_CODE';

  constructor() {
    super('O código do produto deve conter entre 1 e 80 caracteres.');
    this.name = 'InvalidProductCodeError';
  }
}
