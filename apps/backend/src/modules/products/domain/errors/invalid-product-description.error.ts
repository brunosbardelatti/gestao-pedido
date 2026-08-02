export class InvalidProductDescriptionError extends Error {
  readonly code = 'INVALID_PRODUCT_DESCRIPTION';

  constructor() {
    super('A descrição do produto deve conter entre 1 e 255 caracteres.');
    this.name = 'InvalidProductDescriptionError';
  }
}
