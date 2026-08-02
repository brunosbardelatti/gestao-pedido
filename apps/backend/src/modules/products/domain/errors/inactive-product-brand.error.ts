export class InactiveProductBrandError extends Error {
  readonly code = 'PRODUCT_BRAND_INACTIVE';

  constructor() {
    super('A marca informada está inativa e não pode receber novos produtos.');
    this.name = 'InactiveProductBrandError';
  }
}
