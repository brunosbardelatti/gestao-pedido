export class OrderProductInactiveError extends Error {
  readonly code = 'ORDER_PRODUCT_INACTIVE';

  constructor() {
    super('Produtos inativos não podem ser usados em novos pedidos.');
    this.name = 'OrderProductInactiveError';
  }
}
