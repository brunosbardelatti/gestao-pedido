export class CannotResetOwnPasswordError extends Error {
  readonly code = 'BUSINESS_RULE_VIOLATION';

  constructor() {
    super('A senha do próprio usuário não pode ser redefinida por este fluxo.');
    this.name = 'CannotResetOwnPasswordError';
  }
}
