export class SaleNotFoundError extends Error {
  readonly code = 'SALE_NOT_FOUND';

  constructor() {
    super('Venda não encontrada.');
    this.name = 'SaleNotFoundError';
  }
}
