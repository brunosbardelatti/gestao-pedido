import { InvalidBrandNameError } from '../errors/invalid-brand-name.error';

export class BrandName {
  private constructor(
    readonly value: string,
    readonly normalizedValue: string,
  ) {}

  static create(input: string): BrandName {
    const value = input.normalize('NFKC').trim();

    if (value.length === 0 || value.length > 100) {
      throw new InvalidBrandNameError();
    }

    return new BrandName(value, value.toLowerCase());
  }
}
