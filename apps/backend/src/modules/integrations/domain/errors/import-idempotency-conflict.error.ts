export class ImportIdempotencyConflictError extends Error {
  readonly code = 'IMPORT_IDEMPOTENCY_CONFLICT';
  constructor() {
    super('Um rascunho com esta chave de idempotência já existe.');
  }
}
