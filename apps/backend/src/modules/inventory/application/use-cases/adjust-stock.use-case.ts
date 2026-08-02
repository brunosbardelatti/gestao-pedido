import { createHash } from 'node:crypto';

import { ProductNotFoundError } from '../../../products/domain/errors/product-not-found.error';
import { InvalidInventoryAdjustmentError } from '../../domain/errors/invalid-inventory-adjustment.error';
import { InventoryIdempotencyKeyConflictError } from '../../domain/errors/inventory-idempotency-key-conflict.error';
import { InventoryIdempotencyRequestInProgressError } from '../../domain/errors/inventory-idempotency-request-in-progress.error';
import { NegativeStockConfirmationRequiredError } from '../../domain/errors/negative-stock-confirmation-required.error';
import type {
  AdjustStockPersistence,
  InventoryAdjustmentType,
} from '../ports/adjust-stock-persistence';
import type { InventoryMovementRecord } from '../ports/list-inventory-movements-persistence';

export interface AdjustStockInput {
  actorId: string;
  idempotencyKey: string;
  productId: string;
  type: InventoryAdjustmentType;
  quantityDelta: number;
  reason: string;
  confirmNegativeStock?: boolean;
  requestId?: string;
}

const allowedTypes: InventoryAdjustmentType[] = [
  'CORRECTION',
  'PERSONAL_USE',
  'RETURN',
];

export class AdjustStockUseCase {
  constructor(private readonly persistence: AdjustStockPersistence) {}

  async execute(input: AdjustStockInput): Promise<InventoryMovementRecord> {
    const reason = input.reason.normalize('NFKC').trim();
    if (
      !allowedTypes.includes(input.type) ||
      !Number.isInteger(input.quantityDelta) ||
      input.quantityDelta === 0 ||
      input.quantityDelta < -2_147_483_648 ||
      input.quantityDelta > 2_147_483_647 ||
      reason.length === 0 ||
      reason.length > 500
    ) {
      throw new InvalidInventoryAdjustmentError();
    }

    const confirmNegativeStock = input.confirmNegativeStock ?? false;
    const requestHash = createHash('sha256')
      .update(
        JSON.stringify({
          productId: input.productId,
          type: input.type,
          quantityDelta: input.quantityDelta,
          reason,
          confirmNegativeStock,
        }),
      )
      .digest('hex');
    const result = await this.persistence.adjustIdempotently({
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      idempotencyScope: `inventory:adjust:user:${input.actorId}`,
      requestHash,
      productId: input.productId,
      type: input.type,
      quantityDelta: input.quantityDelta,
      reason,
      confirmNegativeStock,
      requestId: input.requestId,
    });

    if (result.status === 'not_found') throw new ProductNotFoundError();
    if (result.status === 'negative_confirmation_required') {
      throw new NegativeStockConfirmationRequiredError();
    }
    if (result.status === 'idempotency_conflict') {
      throw new InventoryIdempotencyKeyConflictError();
    }
    if (result.status === 'idempotency_in_progress') {
      throw new InventoryIdempotencyRequestInProgressError();
    }

    return result.movement;
  }
}
