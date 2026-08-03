export class ApiKeyAlreadyRevokedError extends Error {
  readonly code = 'API_KEY_ALREADY_REVOKED';
  constructor() {
    super('Esta chave de API já foi revogada.');
  }
}
