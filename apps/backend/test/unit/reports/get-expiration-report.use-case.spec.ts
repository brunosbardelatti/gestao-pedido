import { describe, expect, it, vi } from 'vitest';

import type { GetExpirationReportPersistence } from '../../../src/modules/reports/application/ports/get-expiration-report-persistence';
import { GetExpirationReportUseCase } from '../../../src/modules/reports/application/use-cases/get-expiration-report.use-case';

describe('GetExpirationReportUseCase', () => {
  it('uses the seven-day default window and calculates days from today', async () => {
    const persistence: GetExpirationReportPersistence = {
      getExpirations: vi.fn().mockResolvedValue({
        items: [
          {
            orderItemId: 'order-item-id',
            productId: 'product-id',
            productCode: 'P-001',
            description: 'Produto próximo',
            expirationDate: '2026-08-09',
            quantityReceived: 3,
          },
        ],
        total: 1,
      }),
    };
    const useCase = new GetExpirationReportUseCase(
      persistence,
      () => new Date('2026-08-02T23:30:00.000Z'),
    );

    const result = await useCase.execute({ page: 1, pageSize: 20 });

    expect(persistence.getExpirations).toHaveBeenCalledWith({
      page: 1,
      pageSize: 20,
      fromDate: '2026-08-02',
      toDate: '2026-08-09',
    });
    expect(result.items[0]).toMatchObject({
      daysUntilExpiration: 7,
      note: 'Indicativo: o MVP não controla consumo de estoque por lote.',
    });
    expect(result.meta).toEqual({
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    });
  });

  it('derives the end from a custom start and lets an explicit end take precedence', async () => {
    const persistence: GetExpirationReportPersistence = {
      getExpirations: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    };
    const useCase = new GetExpirationReportUseCase(
      persistence,
      () => new Date('2026-08-02T00:00:00.000Z'),
    );

    await useCase.execute({
      page: 2,
      pageSize: 10,
      fromDate: '2026-08-10',
      withinDays: 30,
    });
    await useCase.execute({
      page: 1,
      pageSize: 20,
      fromDate: '2026-08-10',
      toDate: '2026-08-15',
      withinDays: 30,
    });

    expect(persistence.getExpirations).toHaveBeenNthCalledWith(1, {
      page: 2,
      pageSize: 10,
      fromDate: '2026-08-10',
      toDate: '2026-09-09',
    });
    expect(persistence.getExpirations).toHaveBeenNthCalledWith(2, {
      page: 1,
      pageSize: 20,
      fromDate: '2026-08-10',
      toDate: '2026-08-15',
    });
  });
});
