import { describe, expect, it, vi } from 'vitest';

import type { AdjustStockPersistence } from '../../../src/modules/inventory/application/ports/adjust-stock-persistence';
import { AdjustStockUseCase } from '../../../src/modules/inventory/application/use-cases/adjust-stock.use-case';
import { InvalidInventoryAdjustmentError } from '../../../src/modules/inventory/domain/errors/invalid-inventory-adjustment.error';
import { InventoryIdempotencyKeyConflictError } from '../../../src/modules/inventory/domain/errors/inventory-idempotency-key-conflict.error';
import { NegativeStockConfirmationRequiredError } from '../../../src/modules/inventory/domain/errors/negative-stock-confirmation-required.error';
import { ProductNotFoundError } from '../../../src/modules/products/domain/errors/product-not-found.error';

const validInput = {
  actorId: 'actor-id',
  idempotencyKey: '43f20177-301a-439f-883b-fc2e554a2674',
  productId: '26bf7359-befe-4eb9-bcc9-58fc72489be0',
  type: 'CORRECTION' as const,
  quantityDelta: -2,
  reason: '  Avaria identificada  ',
  confirmNegativeStock: false,
  requestId: 'request-id',
};

describe('AdjustStockUseCase', () => {
  it('normalizes the reason and builds an idempotent persistence request', async () => {
    const movement = { id: 'movement-id', quantityDelta: -2 };
    const persistence: AdjustStockPersistence = {
      adjustIdempotently: vi.fn().mockResolvedValue({
        status: 'created',
        movement,
      }),
    };

    const result = await new AdjustStockUseCase(persistence).execute(validInput);

    expect(result).toBe(movement);
    expect(persistence.adjustIdempotently).toHaveBeenCalledWith({
      actorId: 'actor-id',
      idempotencyKey: validInput.idempotencyKey,
      idempotencyScope: 'inventory:adjust:user:actor-id',
      requestHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      productId: validInput.productId,
      type: 'CORRECTION',
      quantityDelta: -2,
      reason: 'Avaria identificada',
      confirmNegativeStock: false,
      requestId: 'request-id',
    });
  });

  it.each([
    { quantityDelta: 0, reason: 'Motivo', type: 'CORRECTION' },
    { quantityDelta: 1.5, reason: 'Motivo', type: 'RETURN' },
    { quantityDelta: 1, reason: '   ', type: 'RETURN' },
    { quantityDelta: 1, reason: 'a'.repeat(501), type: 'RETURN' },
    { quantityDelta: 1, reason: 'Motivo', type: 'PURCHASE' },
  ])('rejects an invalid adjustment %#', async (invalid) => {
    const persistence: AdjustStockPersistence = {
      adjustIdempotently: vi.fn(),
    };

    await expect(
      new AdjustStockUseCase(persistence).execute({
        ...validInput,
        ...invalid,
        type: invalid.type as 'CORRECTION',
      }),
    ).rejects.toBeInstanceOf(InvalidInventoryAdjustmentError);
    expect(persistence.adjustIdempotently).not.toHaveBeenCalled();
  });

  it.each([
    ['not_found', ProductNotFoundError],
    ['negative_confirmation_required', NegativeStockConfirmationRequiredError],
    ['idempotency_conflict', InventoryIdempotencyKeyConflictError],
  ] as const)('maps persistence status %s to a domain error', async (status, error) => {
    const persistence: AdjustStockPersistence = {
      adjustIdempotently: vi.fn().mockResolvedValue({ status }),
    };

    await expect(
      new AdjustStockUseCase(persistence).execute(validInput),
    ).rejects.toBeInstanceOf(error);
  });
});
