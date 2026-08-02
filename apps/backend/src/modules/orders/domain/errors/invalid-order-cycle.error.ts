export class InvalidOrderCycleError extends Error {
  readonly code = 'INVALID_ORDER_CYCLE';

  constructor() {
    super('O ciclo deve conter entre 1 e 80 caracteres.');
    this.name = 'InvalidOrderCycleError';
  }
}
