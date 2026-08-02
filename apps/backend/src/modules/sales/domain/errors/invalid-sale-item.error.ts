export class InvalidSaleItemError extends Error {
  readonly code = 'INVALID_SALE_ITEM';
  constructor() {
    super('Os itens da venda são inválidos.');
    this.name = 'InvalidSaleItemError';
  }
}
