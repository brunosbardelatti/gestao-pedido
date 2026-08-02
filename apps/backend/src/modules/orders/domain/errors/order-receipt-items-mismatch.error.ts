export class OrderReceiptItemsMismatchError extends Error {
  readonly code = 'ORDER_RECEIPT_ITEMS_MISMATCH';

  constructor() {
    super('Confirme exatamente todos os itens deste pedido.');
    this.name = 'OrderReceiptItemsMismatchError';
  }
}
