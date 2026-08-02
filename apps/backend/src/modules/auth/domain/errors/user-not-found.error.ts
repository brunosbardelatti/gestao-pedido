export class UserNotFoundError extends Error {
  readonly code = 'RESOURCE_NOT_FOUND';

  constructor() {
    super('Usuário não encontrado.');
    this.name = 'UserNotFoundError';
  }
}
