export class OrderNotReceivableError extends Error {
  readonly code = 'ORDER_NOT_RECEIVABLE';

  constructor() {
    super('Somente pedidos em aberto podem ser recebidos.');
    this.name = 'OrderNotReceivableError';
  }
}
