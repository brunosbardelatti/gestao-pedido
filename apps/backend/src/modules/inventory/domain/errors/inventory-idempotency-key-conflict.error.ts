export class InventoryIdempotencyKeyConflictError extends Error {
  readonly code = 'IDEMPOTENCY_KEY_CONFLICT';

  constructor() {
    super('A chave de idempotência já foi usada com outros dados.');
  }
}
