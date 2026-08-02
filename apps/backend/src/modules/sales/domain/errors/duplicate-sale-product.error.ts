export class DuplicateSaleProductError extends Error {
  readonly code = 'DUPLICATE_SALE_PRODUCT';
  constructor() {
    super('Cada produto pode aparecer apenas uma vez na venda.');
    this.name = 'DuplicateSaleProductError';
  }
}
