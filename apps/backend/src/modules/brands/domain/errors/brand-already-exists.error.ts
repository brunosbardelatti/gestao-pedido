export class BrandAlreadyExistsError extends Error {
  readonly code = 'BRAND_ALREADY_EXISTS';

  constructor() {
    super('Já existe uma marca com este nome.');
    this.name = 'BrandAlreadyExistsError';
  }
}
