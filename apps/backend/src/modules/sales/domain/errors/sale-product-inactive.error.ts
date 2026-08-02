export class SaleProductInactiveError extends Error {
  readonly code = 'SALE_PRODUCT_INACTIVE';
  constructor() {
    super('Não é possível vender um produto inativo.');
    this.name = 'SaleProductInactiveError';
  }
}
