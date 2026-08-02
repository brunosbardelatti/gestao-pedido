import { InvalidCustomerDataError } from '../errors/invalid-customer-data.error';

interface CustomerProfileInput {
  name: unknown;
  cpf?: unknown;
  phone?: unknown;
  addressLine?: unknown;
  city?: unknown;
  state?: unknown;
  postalCode?: unknown;
}

export interface CustomerProfileValue {
  name: string;
  cpf: string | null;
  phone: string | null;
  addressLine: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
}

export class CustomerProfile {
  private constructor(readonly value: CustomerProfileValue) {}

  static create(input: CustomerProfileInput): CustomerProfile {
    const name = this.requiredText(input.name, 150);
    const cpf = this.optionalText(input.cpf, 11, /^\d{11}$/);
    const phone = this.optionalText(input.phone, 20);
    const addressLine = this.optionalText(input.addressLine, 255);
    const city = this.optionalText(input.city, 100);
    const state = this.optionalText(input.state, 2, /^[A-Za-z]{2}$/)?.toUpperCase() ?? null;
    const postalCode = this.optionalText(input.postalCode, 8, /^\d{8}$/);

    return new CustomerProfile({
      name,
      cpf,
      phone,
      addressLine,
      city,
      state,
      postalCode,
    });
  }

  private static requiredText(value: unknown, maxLength: number): string {
    if (typeof value !== 'string') {
      throw new InvalidCustomerDataError();
    }

    const normalized = value.normalize('NFKC').trim();
    if (normalized.length === 0 || normalized.length > maxLength) {
      throw new InvalidCustomerDataError();
    }

    return normalized;
  }

  private static optionalText(
    value: unknown,
    maxLength: number,
    pattern?: RegExp,
  ): string | null {
    if (value === null || value === undefined) {
      return null;
    }
    if (typeof value !== 'string') {
      throw new InvalidCustomerDataError();
    }

    const normalized = value.normalize('NFKC').trim();
    if (normalized.length === 0) {
      return null;
    }
    if (normalized.length > maxLength || (pattern && !pattern.test(normalized))) {
      throw new InvalidCustomerDataError();
    }

    return normalized;
  }
}
