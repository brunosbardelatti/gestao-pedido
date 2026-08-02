export class SaleProductNotFoundError extends Error {
  readonly code = 'SALE_PRODUCT_NOT_FOUND';
  constructor() {
    super('Produto da venda não encontrado.');
    this.name = 'SaleProductNotFoundError';
  }
}
