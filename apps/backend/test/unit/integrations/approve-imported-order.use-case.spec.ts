import { describe, expect, it, vi } from 'vitest';

import type { ApproveImportedOrderPersistence } from '../../../src/modules/integrations/application/ports/approve-imported-order-persistence';
import { ApproveImportedOrderUseCase } from '../../../src/modules/integrations/application/use-cases/approve-imported-order.use-case';

describe('ApproveImportedOrderUseCase', () => {
  it('delegates approval to the persistence layer and returns the result', async () => {
    const persistence: ApproveImportedOrderPersistence = {
      approve: vi.fn().mockResolvedValue({
        importedOrderId: 'imported-id',
        orderId: 'order-id',
        status: 'APPROVED',
      }),
    };
    const useCase = new ApproveImportedOrderUseCase(persistence);

    const result = await useCase.execute({
      importedOrderId: 'imported-id',
      userId: 'user-id',
      brandId: 'brand-id',
      cycle: 'Ciclo 01/2026',
      orderDate: '2026-08-02',
      items: [
        {
          productId: 'product-id',
          quantityOrdered: 5,
          catalogUnitPrice: '12.50',
          purchaseUnitPrice: '8.00',
          originalUnitPrice: '12.50',
        },
      ],
      requestId: 'req-id',
    });

    expect(result).toEqual({
      importedOrderId: 'imported-id',
      orderId: 'order-id',
      status: 'APPROVED',
    });
    expect(persistence.approve).toHaveBeenCalledWith(
      expect.objectContaining({
        importedOrderId: 'imported-id',
        brandId: 'brand-id',
        cycle: 'Ciclo 01/2026',
      }),
    );
  });
});
