export class InvalidSaleCancelReasonError extends Error {
  readonly code = 'INVALID_SALE_CANCEL_REASON';

  constructor() {
    super('Informe um motivo de cancelamento com até 500 caracteres.');
    this.name = 'InvalidSaleCancelReasonError';
  }
}
