export class OrderNotFoundError extends Error {
  readonly code = 'ORDER_NOT_FOUND';

  constructor() {
    super('Pedido não encontrado.');
    this.name = 'OrderNotFoundError';
  }
}
