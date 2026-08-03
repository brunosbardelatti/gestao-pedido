import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ExpirationReportTable } from '@/components/reports/expiration-report-table';
import type { ExpirationReportItem } from '@/lib/reports';

const note = 'Indicativo: o MVP não controla consumo de estoque por lote.';

const items: ExpirationReportItem[] = [
  {
    orderItemId: 'oi-1',
    productId: 'p-1',
    productCode: 'PERF-001',
    description: 'Essencial feminino',
    expirationDate: '2026-08-04',
    quantityReceived: 3,
    daysUntilExpiration: 2,
    note,
  },
  {
    orderItemId: 'oi-2',
    productId: 'p-2',
    productCode: 'CREME-001',
    description: 'Creme corporal',
    expirationDate: '2026-08-09',
    quantityReceived: 1,
    daysUntilExpiration: 7,
    note,
  },
];

describe('ExpirationReportTable', () => {
  it('renders expiration data and highlights urgent items', () => {
    render(
      <ExpirationReportTable
        items={items}
        meta={{ page: 1, pageSize: 20, total: 2, totalPages: 1 }}
        query={{}}
      />,
    );

    expect(screen.getByText('Essencial feminino')).toBeVisible();
    expect(screen.getByText('04/08/2026')).toBeVisible();
    expect(screen.getByText('3 unidades')).toBeVisible();
    expect(screen.getByText('2 dias')).toBeVisible();
    expect(screen.getByText('Vencimento iminente')).toBeVisible();

    expect(screen.getByText('Creme corporal')).toBeVisible();
    expect(screen.getByText('09/08/2026')).toBeVisible();
    expect(screen.getByText('1 unidade')).toBeVisible();
    expect(screen.getByText('7 dias')).toBeVisible();

    expect(screen.getByText(note)).toBeVisible();
  });

  it('preserves filters in pagination links', () => {
    render(
      <ExpirationReportTable
        items={[items[0]]}
        meta={{ page: 2, pageSize: 1, total: 3, totalPages: 3 }}
        query={{
          fromDate: '2026-08-01',
          toDate: '2026-08-15',
          withinDays: 14,
        }}
      />,
    );

    expect(screen.getByRole('link', { name: 'Página anterior' })).toHaveAttribute(
      'href',
      '/reports/expirations?fromDate=2026-08-01&toDate=2026-08-15&withinDays=14&page=1',
    );
    expect(screen.getByRole('link', { name: 'Próxima página' })).toHaveAttribute(
      'href',
      '/reports/expirations?fromDate=2026-08-01&toDate=2026-08-15&withinDays=14&page=3',
    );
  });

  it('shows an empty state when no items are near expiration', () => {
    render(
      <ExpirationReportTable
        items={[]}
        meta={{ page: 1, pageSize: 20, total: 0, totalPages: 0 }}
        query={{}}
      />,
    );

    expect(
      screen.getByText('Nenhum item com vencimento próximo encontrado.'),
    ).toBeVisible();
    expect(screen.queryByRole('link', { name: 'Próxima página' })).toBeNull();
  });
});
