import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { StockList } from '@/components/inventory/stock-list';
import type { InventoryBalance } from '@/lib/inventory';

const balances: InventoryBalance[] = [
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
    brandName: 'Natura',
    balance: -2,
  },
];

describe('StockList', () => {
  it('renders product balances and clearly identifies negative stock', () => {
    render(
      <StockList
        balances={balances}
        meta={{ page: 1, pageSize: 20, total: 2, totalPages: 1 }}
        query={{}}
      />,
    );

    expect(screen.getByText('Essencial feminino')).toBeVisible();
    expect(screen.getByText('R$ 149,90')).toBeVisible();
    expect(screen.getByText('Sem preço sugerido')).toBeVisible();
    expect(screen.getByText('5 unidades')).toBeVisible();
    expect(screen.getByText('-2 unidades')).toBeVisible();
    expect(screen.getByText('Estoque negativo')).toBeVisible();
  });

  it('preserves filters in pagination links', () => {
    render(
      <StockList
        balances={[balances[0]]}
        meta={{ page: 2, pageSize: 1, total: 3, totalPages: 3 }}
        query={{
          search: 'perf',
          brandId: 'brand-id',
          categoryId: 'category-id',
          negativeOnly: true,
        }}
      />,
    );

    expect(screen.getByRole('link', { name: 'Página anterior' })).toHaveAttribute(
      'href',
      '/inventory?search=perf&brandId=brand-id&categoryId=category-id&negativeOnly=true&page=1',
    );
    expect(screen.getByRole('link', { name: 'Próxima página' })).toHaveAttribute(
      'href',
      '/inventory?search=perf&brandId=brand-id&categoryId=category-id&negativeOnly=true&page=3',
    );
  });

  it('shows an empty state without pagination actions', () => {
    render(
      <StockList
        balances={[]}
        meta={{ page: 1, pageSize: 20, total: 0, totalPages: 0 }}
        query={{ negativeOnly: true }}
      />,
    );

    expect(screen.getByText('Nenhum saldo encontrado.')).toBeVisible();
    expect(screen.queryByRole('link', { name: 'Próxima página' })).toBeNull();
  });
});
