export class ProductAlreadyExistsError extends Error {
  readonly code = 'PRODUCT_ALREADY_EXISTS';

  constructor() {
    super('Já existe um produto com este código para a marca informada.');
    this.name = 'ProductAlreadyExistsError';
  }
}
