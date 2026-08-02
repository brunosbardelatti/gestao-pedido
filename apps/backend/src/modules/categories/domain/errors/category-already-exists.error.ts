export class CategoryAlreadyExistsError extends Error {
  readonly code = 'CATEGORY_ALREADY_EXISTS';

  constructor() {
    super('Já existe uma categoria com este nome.');
    this.name = 'CategoryAlreadyExistsError';
  }
}
