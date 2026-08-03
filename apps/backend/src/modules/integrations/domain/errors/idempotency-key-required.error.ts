export class IdempotencyKeyRequiredError extends Error {
  readonly code = 'IDEMPOTENCY_KEY_REQUIRED';
  constructor() {
    super('Header Idempotency-Key é obrigatório.');
  }
}
