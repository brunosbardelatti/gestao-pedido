export class OrderBrandMismatchError extends Error {
  readonly code = 'ORDER_BRAND_MISMATCH';

  constructor() {
    super('Todos os produtos do pedido devem pertencer à marca informada.');
    this.name = 'OrderBrandMismatchError';
  }
}
