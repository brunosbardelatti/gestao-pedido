export class ProductNotFoundError extends Error {
  readonly code = 'PRODUCT_NOT_FOUND';

  constructor() {
    super('Produto não encontrado.');
    this.name = 'ProductNotFoundError';
  }
}
