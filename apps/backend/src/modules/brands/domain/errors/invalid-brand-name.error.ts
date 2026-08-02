export class InvalidBrandNameError extends Error {
  readonly code = 'INVALID_BRAND_NAME';

  constructor() {
    super('O nome da marca deve conter entre 1 e 100 caracteres.');
    this.name = 'InvalidBrandNameError';
  }
}
