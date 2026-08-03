export class ImportedOrderNotFoundError extends Error {
  readonly code = 'IMPORTED_ORDER_NOT_FOUND';
  constructor() {
    super('Pedido importado não encontrado.');
  }
}
