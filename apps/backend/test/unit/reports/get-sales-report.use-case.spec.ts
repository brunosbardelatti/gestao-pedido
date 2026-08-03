import { describe, expect, it, vi } from 'vitest';

import type { GetSalesReportPersistence } from '../../../src/modules/reports/application/ports/get-sales-report-persistence';
import { GetSalesReportUseCase } from '../../../src/modules/reports/application/use-cases/get-sales-report.use-case';

describe('GetSalesReportUseCase', () => {
  it('returns the requested period with the persisted totals', async () => {
    const persistence: GetSalesReportPersistence = {
      getSalesTotals: vi.fn().mockResolvedValue({
        salesCount: 3,
        itemsCount: 8,
        revenue: '245.90',
      }),
    };
    const useCase = new GetSalesReportUseCase(persistence);

    const result = await useCase.execute({
      startDate: '2026-07-01',
      endDate: '2026-07-31',
      includeCanceled: true,
    });

    expect(persistence.getSalesTotals).toHaveBeenCalledWith({
      startDate: '2026-07-01',
      endDate: '2026-07-31',
      includeCanceled: true,
    });
    expect(result).toEqual({
      startDate: '2026-07-01',
      endDate: '2026-07-31',
      salesCount: 3,
      itemsCount: 8,
      revenue: '245.90',
    });
  });

  it('excludes canceled sales by default', async () => {
    const persistence: GetSalesReportPersistence = {
      getSalesTotals: vi.fn().mockResolvedValue({
        salesCount: 0,
        itemsCount: 0,
        revenue: '0.00',
      }),
    };

    await new GetSalesReportUseCase(persistence).execute({
      startDate: '2026-07-01',
      endDate: '2026-07-31',
    });

    expect(persistence.getSalesTotals).toHaveBeenCalledWith(
      expect.objectContaining({ includeCanceled: false }),
    );
  });
});
