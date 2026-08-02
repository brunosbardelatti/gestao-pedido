export class InvalidOrderNotesError extends Error {
  readonly code = 'INVALID_ORDER_NOTES';

  constructor() {
    super('As observações do item devem conter no máximo 500 caracteres.');
    this.name = 'InvalidOrderNotesError';
  }
}
