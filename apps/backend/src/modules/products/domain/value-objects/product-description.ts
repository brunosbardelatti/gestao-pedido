import { InvalidProductDescriptionError } from '../errors/invalid-product-description.error';

export class ProductDescription {
  private constructor(readonly value: string) {}

  static create(input: string): ProductDescription {
    const value = input.normalize('NFKC').trim();

    if (value.length === 0 || value.length > 255) {
      throw new InvalidProductDescriptionError();
    }

    return new ProductDescription(value);
  }
}
