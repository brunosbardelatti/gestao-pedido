import type {
  InventoryMovementKind,
  InventoryMovementRecord,
} from './list-inventory-movements-persistence';

export type InventoryAdjustmentType = Extract<
  InventoryMovementKind,
  'CORRECTION' | 'PERSONAL_USE' | 'RETURN'
>;

export interface AdjustStockPersistenceInput {
  actorId: string;
  idempotencyKey: string;
  idempotencyScope: string;
  requestHash: string;
  productId: string;
  type: InventoryAdjustmentType;
  quantityDelta: number;
  reason: string;
  confirmNegativeStock: boolean;
  requestId?: string;
}

export type AdjustStockPersistenceResult =
  | { status: 'created'; movement: InventoryMovementRecord }
  | { status: 'replayed'; movement: InventoryMovementRecord }
  | { status: 'not_found' }
  | { status: 'negative_confirmation_required' }
  | { status: 'idempotency_conflict' }
  | { status: 'idempotency_in_progress' };

export interface AdjustStockPersistence {
  adjustIdempotently(
    input: AdjustStockPersistenceInput,
  ): Promise<AdjustStockPersistenceResult>;
}
