export class OrderNotEditableError extends Error {
  readonly code = 'ORDER_NOT_EDITABLE';

  constructor() {
    super('Somente pedidos em aberto podem ser editados.');
    this.name = 'OrderNotEditableError';
  }
}
