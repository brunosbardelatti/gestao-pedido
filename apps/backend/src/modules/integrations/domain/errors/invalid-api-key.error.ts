export class InvalidApiKeyError extends Error {
  readonly code = 'INVALID_API_KEY';
  constructor() {
    super('Chave de API inválida ou revogada.');
  }
}
