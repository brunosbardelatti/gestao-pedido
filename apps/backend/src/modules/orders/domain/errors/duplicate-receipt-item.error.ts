export class DuplicateReceiptItemError extends Error {
  readonly code = 'DUPLICATE_RECEIPT_ITEM';

  constructor() {
    super('Cada item do pedido pode ser confirmado apenas uma vez.');
    this.name = 'DuplicateReceiptItemError';
  }
}
