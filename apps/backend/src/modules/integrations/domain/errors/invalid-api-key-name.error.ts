export class InvalidApiKeyNameError extends Error {
  readonly code = 'INVALID_API_KEY_NAME';
  constructor() {
    super('O nome da chave deve conter entre 1 e 120 caracteres.');
  }
}
