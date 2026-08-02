export class SaleCustomerNotFoundError extends Error {
  readonly code = 'SALE_CUSTOMER_NOT_FOUND';
  constructor() {
    super('Cliente da venda não encontrado.');
    this.name = 'SaleCustomerNotFoundError';
  }
}
