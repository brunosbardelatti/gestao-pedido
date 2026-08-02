import { describe, expect, it, vi } from 'vitest';

import type { GetOrderPersistence } from '../../../src/modules/orders/application/ports/get-order-persistence';
import { GetOrderUseCase } from '../../../src/modules/orders/application/use-cases/get-order.use-case';
import { OrderNotFoundError } from '../../../src/modules/orders/domain/errors/order-not-found.error';

const orderId = 'abfb53af-ec77-4551-9ab2-2e6caf4f24fb';
const order = {
  id: orderId,
  brand: {
    id: '26bf7359-befe-4eb9-bcc9-58fc72489be0',
    name: 'Natura',
    active: true,
    createdAt: '2026-08-02T10:00:00.000Z',
    updatedAt: '2026-08-02T10:00:00.000Z',
  },
  cycle: '12/2026',
  orderDate: '2026-08-02',
  receivedAt: null,
  canceledAt: null,
  cancelReason: null,
  status: 'OPEN',
  notes: null,
  items: [],
  createdAt: '2026-08-02T10:00:00.000Z',
  updatedAt: '2026-08-02T10:00:00.000Z',
};

describe('GetOrderUseCase', () => {
  it('returns the persisted order', async () => {
    const persistence: GetOrderPersistence = {
      findById: vi.fn().mockResolvedValue(order),
    };

    await expect(new GetOrderUseCase(persistence).execute(orderId)).resolves.toEqual(
      order,
    );
  });

  it('rejects an unknown order', async () => {
    const persistence: GetOrderPersistence = {
      findById: vi.fn().mockResolvedValue(null),
    };

    await expect(
      new GetOrderUseCase(persistence).execute(orderId),
    ).rejects.toBeInstanceOf(OrderNotFoundError);
  });
});
