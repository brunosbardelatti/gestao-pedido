import { InvalidProductPriceError } from '../errors/invalid-product-price.error';

export class ProductPrice {
  private constructor(readonly value: string) {}

  static create(input: string): ProductPrice {
    return new ProductPrice(this.normalize(input));
  }

  static createOptional(input?: string | null): ProductPrice | null {
    return input === undefined || input === null
      ? null
      : new ProductPrice(this.normalize(input));
  }

  private static normalize(input: string): string {
    const value = input.normalize('NFKC').trim();
    const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value);

    if (!match) {
      throw new InvalidProductPriceError();
    }

    const integer = (match[1] ?? '').replace(/^0+(?=\d)/, '');
    const fraction = (match[2] ?? '').padEnd(2, '0');

    if (integer.length === 0 || integer.length > 10) {
      throw new InvalidProductPriceError();
    }

    return `${integer}.${fraction}`;
  }
}
