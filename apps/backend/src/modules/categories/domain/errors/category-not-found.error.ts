export class CategoryNotFoundError extends Error {
  readonly code = 'CATEGORY_NOT_FOUND';

  constructor() {
    super('Categoria não encontrada.');
    this.name = 'CategoryNotFoundError';
  }
}
