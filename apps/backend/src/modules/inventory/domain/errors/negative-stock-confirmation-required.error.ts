export class NegativeStockConfirmationRequiredError extends Error {
  readonly code = 'NEGATIVE_STOCK_CONFIRMATION_REQUIRED';

  constructor() {
    super('Confirme explicitamente o ajuste que deixará o estoque negativo.');
  }
}
