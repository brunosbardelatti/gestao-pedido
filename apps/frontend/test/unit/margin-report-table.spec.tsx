import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MarginReportTable } from '@/components/reports/margin-report-table';
import type { MarginReportItem } from '@/lib/reports';

const items: MarginReportItem[] = [
  {
    productId: '6a9028c4-b4dc-4132-b897-cd9e8049a33f',
    productCode: 'P-001',
    description: 'Produto rentável',
    quantitySold: 2,
    revenue: '30.00',
    cost: '18.00',
    margin: '12.00',
    marginPercent: 40,
  },
  {
    productId: '1368f73e-d016-43ce-906e-13a5194ffb18',
    productCode: 'P-002',
    description: 'Produto com perda',
    quantitySold: 1,
    revenue: '10.00',
    cost: '12.00',
    margin: '-2.00',
    marginPercent: -20,
  },
];

describe('MarginReportTable', () => {
  it('renders snapshot totals and clearly identifies negative margin', () => {
    render(
      <MarginReportTable
        items={items}
        meta={{ page: 1, pageSize: 20, total: 2, totalPages: 1 }}
        query={{ startDate: '2026-07-01', endDate: '2026-07-31' }}
      />,
    );

    expect(screen.getByText('Produto rentável')).toBeVisible();
    expect(screen.getByText('R$ 30,00')).toBeVisible();
    expect(screen.getByText('R$ 18,00')).toBeVisible();
    expect(screen.getAllByText('R$ 12,00')).toHaveLength(2);
    expect(screen.getByText('40,00%')).toBeVisible();
    expect(screen.getByText('-R$ 2,00')).toBeVisible();
    expect(screen.getByText('Margem negativa')).toBeVisible();
  });

  it('preserves period and product filters in pagination links', () => {
    render(
      <MarginReportTable
        items={[items[0]]}
        meta={{ page: 2, pageSize: 1, total: 3, totalPages: 3 }}
        query={{
          startDate: '2026-07-01',
          endDate: '2026-07-31',
          productId: 'product-id',
        }}
      />,
    );

    expect(screen.getByRole('link', { name: 'Página anterior' })).toHaveAttribute(
      'href',
      '/reports/margins?startDate=2026-07-01&endDate=2026-07-31&productId=product-id&page=1',
    );
    expect(screen.getByRole('link', { name: 'Próxima página' })).toHaveAttribute(
      'href',
      '/reports/margins?startDate=2026-07-01&endDate=2026-07-31&productId=product-id&page=3',
    );
  });

  it('shows an empty state for a period without completed sales', () => {
    render(
      <MarginReportTable
        items={[]}
        meta={{ page: 1, pageSize: 20, total: 0, totalPages: 0 }}
        query={{ startDate: '2026-07-01', endDate: '2026-07-31' }}
      />,
    );

    expect(screen.getByText('Nenhuma margem encontrada no período.')).toBeVisible();
  });
});
