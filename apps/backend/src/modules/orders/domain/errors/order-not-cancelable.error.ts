export class OrderNotCancelableError extends Error {
  readonly code = 'ORDER_NOT_CANCELABLE';

  constructor() {
    super('Somente pedidos em aberto podem ser cancelados.');
    this.name = 'OrderNotCancelableError';
  }
}
