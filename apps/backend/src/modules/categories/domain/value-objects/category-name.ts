import { InvalidCategoryNameError } from '../errors/invalid-category-name.error';

export class CategoryName {
  private constructor(
    readonly value: string,
    readonly normalizedValue: string,
  ) {}

  static create(input: string): CategoryName {
    const value = input.normalize('NFKC').trim();

    if (value.length === 0 || value.length > 100) {
      throw new InvalidCategoryNameError();
    }

    return new CategoryName(value, value.toLowerCase());
  }
}
