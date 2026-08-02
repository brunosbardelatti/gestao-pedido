export class InvalidProductPriceError extends Error {
  readonly code = 'INVALID_PRODUCT_PRICE';

  constructor() {
    super(
      'Os preços devem ser valores não negativos com até duas casas decimais.',
    );
    this.name = 'InvalidProductPriceError';
  }
}
