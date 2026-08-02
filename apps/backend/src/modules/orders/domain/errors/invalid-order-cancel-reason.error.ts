export class InvalidOrderCancelReasonError extends Error {
  readonly code = 'INVALID_ORDER_CANCEL_REASON';

  constructor() {
    super('Informe um motivo de cancelamento com até 500 caracteres.');
    this.name = 'InvalidOrderCancelReasonError';
  }
}
