export class SaleIdempotencyRequestInProgressError extends Error {
  readonly code = 'SALE_IDEMPOTENCY_REQUEST_IN_PROGRESS';
  constructor() {
    super('Já existe uma venda em processamento para esta chave.');
    this.name = 'SaleIdempotencyRequestInProgressError';
  }
}
