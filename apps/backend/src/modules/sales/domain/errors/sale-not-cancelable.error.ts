export class SaleNotCancelableError extends Error {
  readonly code = 'SALE_NOT_CANCELABLE';

  constructor() {
    super('Somente vendas concluídas podem ser canceladas.');
    this.name = 'SaleNotCancelableError';
  }
}
