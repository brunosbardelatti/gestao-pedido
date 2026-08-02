export class InactiveProductCategoryError extends Error {
  readonly code = 'PRODUCT_CATEGORY_INACTIVE';

  constructor() {
    super(
      'A categoria informada está inativa e não pode receber novos produtos.',
    );
    this.name = 'InactiveProductCategoryError';
  }
}
