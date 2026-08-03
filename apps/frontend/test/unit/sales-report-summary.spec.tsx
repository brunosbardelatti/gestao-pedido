import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SalesReportSummary } from '@/components/reports/sales-report-summary';

describe('SalesReportSummary', () => {
  it('formats consolidated sales metrics and identifies canceled inclusion', () => {
    render(
      <SalesReportSummary
        report={{
          startDate: '2026-07-01',
          endDate: '2026-07-31',
          salesCount: 2,
          itemsCount: 3,
          revenue: '70.00',
        }}
        includeCanceled
      />,
    );

    expect(screen.getByText('R$ 70,00')).toBeVisible();
    expect(screen.getByText('2 vendas')).toBeVisible();
    expect(screen.getByText('3 itens vendidos')).toBeVisible();
    expect(screen.getByText('Inclui vendas canceladas')).toBeVisible();
    expect(screen.getByText('01/07/2026 a 31/07/2026')).toBeVisible();
  });

  it('shows the valid-sales scope and handles zero values', () => {
    render(
      <SalesReportSummary
        report={{
          startDate: '2026-08-01',
          endDate: '2026-08-31',
          salesCount: 0,
          itemsCount: 0,
          revenue: '0.00',
        }}
        includeCanceled={false}
      />,
    );

    expect(screen.getByText('R$ 0,00')).toBeVisible();
    expect(screen.getByText('0 vendas')).toBeVisible();
    expect(screen.getByText('0 itens vendidos')).toBeVisible();
    expect(screen.getByText('Somente vendas concluídas')).toBeVisible();
  });
});
