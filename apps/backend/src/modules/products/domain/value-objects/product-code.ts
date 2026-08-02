import { InvalidProductCodeError } from '../errors/invalid-product-code.error';

export class ProductCode {
  private constructor(
    readonly value: string,
    readonly normalizedValue: string,
  ) {}

  static create(input: string): ProductCode {
    const value = input.normalize('NFKC').trim();

    if (value.length === 0 || value.length > 80) {
      throw new InvalidProductCodeError();
    }

    return new ProductCode(value, value.toLowerCase());
  }
}
