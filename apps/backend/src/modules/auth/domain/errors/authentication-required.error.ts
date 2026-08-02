export class AuthenticationRequiredError extends Error {
  readonly code = 'UNAUTHORIZED';

  constructor() {
    super('Autenticação necessária.');
    this.name = 'AuthenticationRequiredError';
  }
}
