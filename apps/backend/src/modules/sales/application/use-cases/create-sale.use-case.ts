import { createHash } from 'node:crypto';

import { NegativeStockConfirmationRequiredError } from '../../../inventory/domain/errors/negative-stock-confirmation-required.error';
import { SaleCustomerInactiveError } from '../../domain/errors/sale-customer-inactive.error';
import { SaleCustomerNotFoundError } from '../../domain/errors/sale-customer-not-found.error';
import { SaleIdempotencyKeyConflictError } from '../../domain/errors/sale-idempotency-key-conflict.error';
import { SaleIdempotencyRequestInProgressError } from '../../domain/errors/sale-idempotency-request-in-progress.error';
import { SaleProductInactiveError } from '../../domain/errors/sale-product-inactive.error';
import { SaleProductNotFoundError } from '../../domain/errors/sale-product-not-found.error';
import { normalizeSaleInput } from '../normalize-sale-input';
import type {
  CreateSalePersistence,
  PersistedSale,
  SalePaymentMethod,
} from '../ports/create-sale-persistence';

export interface CreateSaleInput {
  actorId: string;
  idempotencyKey: string;
  customerId?: string | null;
  paymentMethod?: SalePaymentMethod | null;
  notes?: string | null;
  confirmNegativeStock?: boolean;
  items: Array<{ productId: string; quantity: number; unitPrice: string }>;
  requestId?: string;
}

export class CreateSaleUseCase {
  constructor(private readonly persistence: CreateSalePersistence) {}

  async execute(input: CreateSaleInput): Promise<PersistedSale> {
    const normalized = normalizeSaleInput(input);
    const requestHash = createHash('sha256')
      .update(JSON.stringify(normalized))
      .digest('hex');
    const result = await this.persistence.createIdempotently({
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      idempotencyScope: `sales:create:user:${input.actorId}`,
      requestHash,
      ...normalized,
      requestId: input.requestId,
    });

    if (result.status === 'customer_not_found') throw new SaleCustomerNotFoundError();
    if (result.status === 'customer_inactive') throw new SaleCustomerInactiveError();
    if (result.status === 'product_not_found') throw new SaleProductNotFoundError();
    if (result.status === 'product_inactive') throw new SaleProductInactiveError();
    if (result.status === 'negative_stock_confirmation_required') {
      throw new NegativeStockConfirmationRequiredError();
    }
    if (result.status === 'idempotency_conflict') {
      throw new SaleIdempotencyKeyConflictError();
    }
    if (result.status === 'idempotency_in_progress') {
      throw new SaleIdempotencyRequestInProgressError();
    }
    return result.sale;
  }
}
