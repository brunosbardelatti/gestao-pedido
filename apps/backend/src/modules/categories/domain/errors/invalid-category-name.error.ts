export class InvalidCategoryNameError extends Error {
  readonly code = 'INVALID_CATEGORY_NAME';

  constructor() {
    super('O nome da categoria deve conter entre 1 e 100 caracteres.');
    this.name = 'InvalidCategoryNameError';
  }
}
