import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SaleList } from '@/components/sales/sale-list';
import type { SaleDetails } from '@/lib/sales';

const createdAt = '2026-08-02T12:00:00.000Z';
const sales: SaleDetails[] = [
  {
    id: '6a9028c4-b4dc-4132-b897-cd9e8049a33f',
    customer: {
      id: 'customer-1',
      name: 'Maria Cliente',
      cpf: null,
      phone: null,
      addressLine: null,
      city: null,
      state: null,
      postalCode: null,
      active: true,
      createdAt,
      updatedAt: createdAt,
    },
    status: 'COMPLETED',
    saleDate: createdAt,
    paymentMethod: 'PIX',
    total: '24.00',
    notes: null,
    canceledAt: null,
    cancelReason: null,
    items: [
      {
        id: 'item-1',
        productId: 'product-1',
        productCode: 'PERF-1',
        productDescription: 'Perfume Floral',
        quantity: 2,
        unitPrice: '12.00',
        unitCostSnapshot: '6.00',
        subtotal: '24.00',
      },
    ],
    createdAt,
    updatedAt: createdAt,
  },
  {
    id: '1368f73e-d016-43ce-906e-13a5194ffb18',
    customer: null,
    status: 'CANCELED',
    saleDate: '2026-08-01T12:00:00.000Z',
    paymentMethod: null,
    total: '4.50',
    notes: null,
    canceledAt: createdAt,
    cancelReason: 'Cliente desistiu',
    items: [],
    createdAt,
    updatedAt: createdAt,
  },
];

describe('SaleList', () => {
  it('renders sale identity, totals, statuses, item details and actions', () => {
    render(
      <SaleList
        sales={sales}
        meta={{ page: 1, pageSize: 20, total: 2, totalPages: 1 }}
        query={{}}
      />,
    );
    expect(screen.getByText('Maria Cliente')).toBeVisible();
    expect(screen.getByText('Sem cliente')).toBeVisible();
    expect(screen.getAllByText('Concluída')[0]).toBeVisible();
    expect(screen.getByText('Cancelada')).toBeVisible();
    expect(screen.getAllByText('R$ 24,00')[0]).toBeVisible();
    expect(screen.getByText('1 produto / 2 unidades')).toBeVisible();
    expect(screen.getByText('PERF-1 - Perfume Floral')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Baixar recibo' })).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Cancelar venda' })).toBeInTheDocument();
    expect(screen.getByText('Motivo: Cliente desistiu')).toBeInTheDocument();
  });

  it('preserves every filter in pagination links', () => {
    render(
      <SaleList
        sales={[sales[0]]}
        meta={{ page: 2, pageSize: 1, total: 3, totalPages: 3 }}
        query={{
          status: 'COMPLETED',
          customerId: 'customer-1',
          startDate: '2026-08-01',
          endDate: '2026-08-31',
        }}
      />,
    );
    expect(screen.getByRole('link', { name: 'Página anterior' })).toHaveAttribute(
      'href',
      '/sales?status=COMPLETED&customerId=customer-1&startDate=2026-08-01&endDate=2026-08-31&page=1',
    );
    expect(screen.getByRole('link', { name: 'Próxima página' })).toHaveAttribute(
      'href',
      '/sales?status=COMPLETED&customerId=customer-1&startDate=2026-08-01&endDate=2026-08-31&page=3',
    );
  });

  it('renders an empty state without pagination actions', () => {
    render(
      <SaleList
        sales={[]}
        meta={{ page: 1, pageSize: 20, total: 0, totalPages: 0 }}
        query={{}}
      />,
    );
    expect(screen.getByText('Nenhuma venda encontrada.')).toBeVisible();
    expect(screen.queryByRole('link', { name: 'Próxima página' })).toBeNull();
  });
});
