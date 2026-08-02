export class InvalidOrderItemError extends Error {
  readonly code = 'INVALID_ORDER_ITEM';

  constructor() {
    super('O pedido deve conter itens com quantidades inteiras positivas.');
    this.name = 'InvalidOrderItemError';
  }
}
