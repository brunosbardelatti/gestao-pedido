export class InsufficientRoleError extends Error {
  readonly code = 'FORBIDDEN';

  constructor() {
    super('Acesso negado.');
    this.name = 'InsufficientRoleError';
  }
}
