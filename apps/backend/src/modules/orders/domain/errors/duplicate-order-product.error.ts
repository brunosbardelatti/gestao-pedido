export class DuplicateOrderProductError extends Error {
  readonly code = 'DUPLICATE_ORDER_PRODUCT';

  constructor() {
    super('Cada produto pode aparecer apenas uma vez no pedido.');
    this.name = 'DuplicateOrderProductError';
  }
}
