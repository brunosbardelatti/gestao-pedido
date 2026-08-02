export class InvalidOrderDateError extends Error {
  readonly code = 'INVALID_ORDER_DATE';

  constructor() {
    super('A data do pedido deve ser uma data válida no formato AAAA-MM-DD.');
    this.name = 'InvalidOrderDateError';
  }
}
