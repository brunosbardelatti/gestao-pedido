export class InvalidOrderCycleError extends Error {
  readonly code = 'INVALID_ORDER_CYCLE';

  constructor() {
    super('O ciclo deve estar no formato MM/AAAA (ex: 08/2026).');
    this.name = 'InvalidOrderCycleError';
  }
}
