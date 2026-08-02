export class InvalidSalePaymentMethodError extends Error {
  readonly code = 'INVALID_SALE_PAYMENT_METHOD';
  constructor() {
    super('A forma de pagamento é inválida.');
    this.name = 'InvalidSalePaymentMethodError';
  }
}
