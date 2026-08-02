import { DuplicateSaleProductError } from '../domain/errors/duplicate-sale-product.error';
import { InvalidSaleItemError } from '../domain/errors/invalid-sale-item.error';
import { InvalidSalePaymentMethodError } from '../domain/errors/invalid-sale-payment-method.error';
import type {
  CreateSalePersistenceItemInput,
  SalePaymentMethod,
} from './ports/create-sale-persistence';

const paymentMethods = new Set<SalePaymentMethod>([
  'CASH',
  'PIX',
  'DEBIT_CARD',
  'CREDIT_CARD',
  'BANK_TRANSFER',
  'OTHER',
]);
const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface RawSaleItem {
  productId: string;
  quantity: number;
  unitPrice: string;
}

export interface NormalizedSaleInput {
  customerId: string | null;
  paymentMethod: SalePaymentMethod | null;
  notes: string | null;
  confirmNegativeStock: boolean;
  total: string;
  items: CreateSalePersistenceItemInput[];
}

function moneyToCents(value: string): bigint {
  if (typeof value !== 'string') throw new InvalidSaleItemError();
  const match = /^(\d{1,10})(?:\.(\d{1,2}))?$/.exec(
    value.normalize('NFKC').trim(),
  );
  if (!match) throw new InvalidSaleItemError();
  return BigInt(match[1] ?? '0') * 100n + BigInt((match[2] ?? '').padEnd(2, '0'));
}

function centsToMoney(value: bigint): string {
  const integer = value / 100n;
  const fraction = String(value % 100n).padStart(2, '0');
  return `${integer}.${fraction}`;
}

export function normalizeSaleInput(input: {
  customerId?: string | null;
  paymentMethod?: SalePaymentMethod | null;
  notes?: string | null;
  confirmNegativeStock?: boolean;
  items: RawSaleItem[];
}): NormalizedSaleInput {
  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new InvalidSaleItemError();
  }
  if (input.paymentMethod && !paymentMethods.has(input.paymentMethod)) {
    throw new InvalidSalePaymentMethodError();
  }

  const productIds = new Set<string>();
  let totalCents = 0n;
  const items = input.items.map((item) => {
    if (
      !uuidV4.test(item.productId) ||
      !Number.isSafeInteger(item.quantity) ||
      item.quantity < 1
    ) {
      throw new InvalidSaleItemError();
    }
    if (productIds.has(item.productId)) throw new DuplicateSaleProductError();
    productIds.add(item.productId);

    const unitPriceCents = moneyToCents(item.unitPrice);
    const subtotalCents = unitPriceCents * BigInt(item.quantity);
    totalCents += subtotalCents;
    return {
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: centsToMoney(unitPriceCents),
      subtotal: centsToMoney(subtotalCents),
    };
  });

  return {
    customerId: input.customerId ?? null,
    paymentMethod: input.paymentMethod ?? null,
    notes:
      typeof input.notes === 'string'
        ? input.notes.normalize('NFKC').trim() || null
        : null,
    confirmNegativeStock: input.confirmNegativeStock ?? false,
    total: centsToMoney(totalCents),
    items,
  };
}
