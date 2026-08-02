export class InventoryIdempotencyRequestInProgressError extends Error {
  readonly code = 'IDEMPOTENCY_REQUEST_IN_PROGRESS';

  constructor() {
    super('Já existe uma solicitação em processamento com esta chave.');
  }
}
