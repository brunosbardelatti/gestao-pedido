import { describe, expect, it, vi } from 'vitest';

import type { RejectImportedOrderPersistence } from '../../../src/modules/integrations/application/ports/reject-imported-order-persistence';
import { RejectImportedOrderUseCase } from '../../../src/modules/integrations/application/use-cases/reject-imported-order.use-case';

describe('RejectImportedOrderUseCase', () => {
  it('delegates rejection to the persistence layer', async () => {
    const persistence: RejectImportedOrderPersistence = {
      reject: vi.fn().mockResolvedValue(undefined),
    };
    const useCase = new RejectImportedOrderUseCase(persistence);

    await useCase.execute({
      importedOrderId: 'imported-id',
      userId: 'user-id',
      reason: 'Dados incorretos no XML',
      requestId: 'req-id',
    });

    expect(persistence.reject).toHaveBeenCalledWith({
      importedOrderId: 'imported-id',
      userId: 'user-id',
      reason: 'Dados incorretos no XML',
      requestId: 'req-id',
    });
  });
});
