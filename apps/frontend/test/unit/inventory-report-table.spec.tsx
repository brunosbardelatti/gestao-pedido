import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { InventoryReportTable } from '@/components/reports/inventory-report-table';
import type { InventoryReportItem } from '@/lib/reports';

const items: InventoryReportItem[] = [
  {
    productId: '6a9028c4-b4dc-4132-b897-cd9e8049a33f',
    productCode: 'PERF-001',
    description: 'Essencial feminino',
    brandName: 'Natura',
    balance: 5,
    suggestedSalePrice: '149.90',
  },
  {
    productId: '1368f73e-d016-43ce-906e-13a5194ffb18',
    productCode: 'CREME-001',
    description: 'Creme corporal',
    brandName: 'Avon',
    balance: -2,
  },
];

describe('InventoryReportTable', () => {
  it('renders report values and highlights negative inventory', () => {
    render(
      <InventoryReportTable
        items={items}
        meta={{ page: 1, pageSize: 20, total: 2, totalPages: 1 }}
        query={{}}
      />,
    );

    expect(screen.getByText('Essencial feminino')).toBeVisible();
    expect(screen.getByText('Natura')).toBeVisible();
    expect(screen.getByText('R$ 149,90')).toBeVisible();
    expect(screen.getByText('-2 unidades')).toBeVisible();
    expect(screen.getByText('Estoque negativo')).toBeVisible();
  });

  it('preserves search and sorting in pagination links', () => {
    render(
      <InventoryReportTable
        items={[items[0]]}
        meta={{ page: 2, pageSize: 1, total: 3, totalPages: 3 }}
        query={{
          search: 'natura',
          sortBy: 'balance',
          sortOrder: 'desc',
        }}
      />,
    );

    expect(screen.getByRole('link', { name: 'Página anterior' })).toHaveAttribute(
      'href',
      '/reports/inventory?search=natura&sortBy=balance&sortOrder=desc&page=1',
    );
    expect(screen.getByRole('link', { name: 'Próxima página' })).toHaveAttribute(
      'href',
      '/reports/inventory?search=natura&sortBy=balance&sortOrder=desc&page=3',
    );
  });

  it('shows a report-specific empty state', () => {
    render(
      <InventoryReportTable
        items={[]}
        meta={{ page: 1, pageSize: 20, total: 0, totalPages: 0 }}
        query={{}}
      />,
    );

    expect(screen.getByText('Nenhum produto encontrado no relatório.')).toBeVisible();
    expect(screen.queryByRole('link', { name: 'Próxima página' })).toBeNull();
  });
});
