import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { InventoryMovementList } from '@/components/inventory/inventory-movement-list';
import type { InventoryMovement } from '@/lib/inventory';

const movements: InventoryMovement[] = [
  {
    id: 'movement-1',
    productId: 'product-1',
    type: 'PURCHASE',
    quantityDelta: 5,
    reason: null,
    orderItemId: 'order-item-1',
    saleItemId: null,
    createdBy: {
      id: 'user-1',
      name: 'Ana Silva',
      login: 'ana',
      role: 'OPERATOR',
      active: true,
    },
    createdAt: '2026-07-20T15:00:00.000Z',
  },
  {
    id: 'movement-2',
    productId: 'product-2',
    type: 'CORRECTION',
    quantityDelta: -2,
    reason: 'Avaria identificada',
    orderItemId: null,
    saleItemId: null,
    createdBy: {
      id: 'user-1',
      name: 'Ana Silva',
      login: 'ana',
      role: 'OPERATOR',
      active: true,
    },
    createdAt: '2026-07-19T15:00:00.000Z',
  },
];

describe('InventoryMovementList', () => {
  it('renders product, delta, type, origin, user and reason', () => {
    render(
      <InventoryMovementList
        movements={movements}
        products={[
          { id: 'product-1', code: 'PERF-001', description: 'Essencial' },
          { id: 'product-2', code: 'CREME-001', description: 'Creme corporal' },
        ]}
        meta={{ page: 1, pageSize: 20, total: 2, totalPages: 1 }}
        query={{}}
      />,
    );

    expect(screen.getByText('PERF-001')).toBeVisible();
    expect(screen.getByText('+5 unidades')).toBeVisible();
    expect(screen.getByText('Compra')).toBeVisible();
    expect(screen.getByText('Entrada por pedido')).toBeVisible();
    expect(screen.getByText('-2 unidades')).toBeVisible();
    expect(screen.getByText('Correção')).toBeVisible();
    expect(screen.getByText('Ajuste manual')).toBeVisible();
    expect(screen.getByText('Avaria identificada')).toBeVisible();
    expect(screen.getAllByText('Ana Silva')).toHaveLength(2);
  });

  it('preserves filters in pagination links', () => {
    render(
      <InventoryMovementList
        movements={[movements[0]]}
        products={[
          { id: 'product-1', code: 'PERF-001', description: 'Essencial' },
        ]}
        meta={{ page: 2, pageSize: 1, total: 3, totalPages: 3 }}
        query={{
          productId: 'product-1',
          type: 'PURCHASE',
          startDate: '2026-07-01',
          endDate: '2026-07-31',
        }}
      />,
    );

    expect(screen.getByRole('link', { name: 'Página anterior' })).toHaveAttribute(
      'href',
      '/inventory/movements?productId=product-1&type=PURCHASE&startDate=2026-07-01&endDate=2026-07-31&page=1',
    );
    expect(screen.getByRole('link', { name: 'Próxima página' })).toHaveAttribute(
      'href',
      '/inventory/movements?productId=product-1&type=PURCHASE&startDate=2026-07-01&endDate=2026-07-31&page=3',
    );
  });

  it('shows an empty state without pagination actions', () => {
    render(
      <InventoryMovementList
        movements={[]}
        products={[]}
        meta={{ page: 1, pageSize: 20, total: 0, totalPages: 0 }}
        query={{ type: 'RETURN' }}
      />,
    );

    expect(screen.getByText('Nenhuma movimentação encontrada.')).toBeVisible();
    expect(screen.queryByRole('link', { name: 'Próxima página' })).toBeNull();
  });
});
