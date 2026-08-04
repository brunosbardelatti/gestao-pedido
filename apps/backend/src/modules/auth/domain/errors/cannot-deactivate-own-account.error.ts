export class CannotDeactivateOwnAccountError extends Error {
  readonly code = 'BUSINESS_RULE_VIOLATION';

  constructor() {
    super('Não é possível desativar a própria conta.');
    this.name = 'CannotDeactivateOwnAccountError';
  }
}
