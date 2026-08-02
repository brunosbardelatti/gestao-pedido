import { InvalidExpirationDateError } from '../errors/invalid-expiration-date.error';

export class ExpirationDate {
  private constructor(readonly value: string) {}

  static createOptional(value?: string | null): ExpirationDate | null {
    if (value === null || value === undefined) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new InvalidExpirationDateError();
    }

    const date = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
      throw new InvalidExpirationDateError();
    }

    return new ExpirationDate(value);
  }
}
