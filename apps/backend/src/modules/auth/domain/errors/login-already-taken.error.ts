export class LoginAlreadyTakenError extends Error {
  readonly code = 'CONFLICT';

  constructor() {
    super('Login já está em uso.');
    this.name = 'LoginAlreadyTakenError';
  }
}
