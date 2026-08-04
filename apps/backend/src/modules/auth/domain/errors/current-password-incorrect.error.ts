export class CurrentPasswordIncorrectError extends Error {
  readonly code = 'BUSINESS_RULE_VIOLATION';

  constructor() {
    super('Senha atual incorreta.');
    this.name = 'CurrentPasswordIncorrectError';
  }
}
