export class InvalidReceiptItemError extends Error {
  readonly code = 'INVALID_RECEIPT_ITEM';

  constructor() {
    super('Informe ao menos um item com uma quantidade recebida válida.');
    this.name = 'InvalidReceiptItemError';
  }
}
