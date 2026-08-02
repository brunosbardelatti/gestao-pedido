export class BrandNotFoundError extends Error {
  readonly code = 'BRAND_NOT_FOUND';

  constructor() {
    super('Marca não encontrada.');
    this.name = 'BrandNotFoundError';
  }
}
