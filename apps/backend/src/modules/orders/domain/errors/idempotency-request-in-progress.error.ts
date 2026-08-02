export class IdempotencyRequestInProgressError extends Error {
  readonly code = 'IDEMPOTENCY_REQUEST_IN_PROGRESS';

  constructor() {
    super('Já existe uma solicitação em processamento para esta chave.');
    this.name = 'IdempotencyRequestInProgressError';
  }
}
