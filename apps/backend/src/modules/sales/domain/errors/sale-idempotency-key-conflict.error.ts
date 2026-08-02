export class SaleIdempotencyKeyConflictError extends Error {
  readonly code = 'SALE_IDEMPOTENCY_KEY_CONFLICT';
  constructor() {
    super('A chave de idempotência já foi usada com outra venda.');
    this.name = 'SaleIdempotencyKeyConflictError';
  }
}
