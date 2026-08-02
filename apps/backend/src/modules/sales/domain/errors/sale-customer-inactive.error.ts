export class SaleCustomerInactiveError extends Error {
  readonly code = 'SALE_CUSTOMER_INACTIVE';
  constructor() {
    super('Não é possível vincular um cliente inativo à venda.');
    this.name = 'SaleCustomerInactiveError';
  }
}
