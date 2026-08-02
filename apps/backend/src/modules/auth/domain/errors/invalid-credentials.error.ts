export class InvalidCredentialsError extends Error {
  readonly code = 'INVALID_CREDENTIALS';

  constructor() {
    super('Login ou senha inválidos.');
    this.name = 'InvalidCredentialsError';
  }
}
