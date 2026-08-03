export class ApiKeyNotFoundError extends Error {
  readonly code = 'API_KEY_NOT_FOUND';
  constructor() {
    super('Chave de API não encontrada.');
  }
}
