import { describe, expect, it, vi } from 'vitest';

import type { GetMarginReportPersistence } from '../../../src/modules/reports/application/ports/get-margin-report-persistence';
import { GetMarginReportUseCase } from '../../../src/modules/reports/application/use-cases/get-margin-report.use-case';

describe('GetMarginReportUseCase', () => {
  it('calculates positive and negative margins from persisted snapshots', async () => {
    const persistence: GetMarginReportPersistence = {
      getMargins: vi.fn().mockResolvedValue({
        items: [
          {
            productId: 'product-1',
            productCode: 'P-1',
            description: 'Produto rentável',
            quantitySold: 2,
            revenue: '30.00',
            cost: '18.00',
          },
          {
            productId: 'product-2',
            productCode: 'P-2',
            description: 'Produto com perda',
            quantitySold: 1,
            revenue: '10.00',
            cost: '12.00',
          },
        ],
        total: 2,
      }),
    };
    const useCase = new GetMarginReportUseCase(persistence);

    const result = await useCase.execute({
      page: 1,
      pageSize: 20,
      startDate: '2026-07-01',
      endDate: '2026-07-31',
    });

    expect(result.items).toEqual([
      expect.objectContaining({ margin: '12.00', marginPercent: 40 }),
      expect.objectContaining({ margin: '-2.00', marginPercent: -20 }),
    ]);
    expect(result.meta).toEqual({
      page: 1,
      pageSize: 20,
      total: 2,
      totalPages: 1,
    });
  });

  it('returns a null percentage when revenue is zero and forwards filters', async () => {
    const persistence: GetMarginReportPersistence = {
      getMargins: vi.fn().mockResolvedValue({
        items: [
          {
            productId: 'product-1',
            productCode: 'P-1',
            description: 'Amostra',
            quantitySold: 1,
            revenue: '0.00',
            cost: '5.00',
          },
        ],
        total: 1,
      }),
    };
    const useCase = new GetMarginReportUseCase(persistence);

    const result = await useCase.execute({
      page: 2,
      pageSize: 10,
      startDate: '2026-07-01',
      endDate: '2026-07-31',
      productId: '26bf7359-befe-4eb9-bcc9-58fc72489be0',
    });

    expect(persistence.getMargins).toHaveBeenCalledWith({
      page: 2,
      pageSize: 10,
      startDate: '2026-07-01',
      endDate: '2026-07-31',
      productId: '26bf7359-befe-4eb9-bcc9-58fc72489be0',
    });
    expect(result.items[0]).toMatchObject({
      margin: '-5.00',
      marginPercent: null,
    });
  });
});
