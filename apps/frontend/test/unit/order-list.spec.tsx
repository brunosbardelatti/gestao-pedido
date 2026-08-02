import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { OrderList } from '@/components/orders/order-list';
import type { OrderDetails } from '@/lib/orders';

const createdAt = '2026-08-02T12:00:00.000Z';
const orders: OrderDetails[] = [
  {
    id: '6a9028c4-b4dc-4132-b897-cd9e8049a33f',
    brand: {
      id: 'brand-id',
      name: 'Natura',
      active: true,
      createdAt,
      updatedAt: createdAt,
    },
    cycle: 'Ciclo 10',
    orderDate: '2026-07-20',
    receivedAt: null,
    canceledAt: null,
    cancelReason: null,
    status: 'OPEN',
    notes: null,
    items: [
      {
        id: 'item-1',
        productId: 'product-1',
        productCode: 'NAT-001',
        productDescription: 'Essencial',
        quantityOrdered: 2,
        quantityReceived: 0,
        catalogUnitPrice: '100.00',
        purchaseUnitPrice: '60.00',
        originalUnitPrice: '120.00',
        expirationDate: null,
        notes: null,
      },
      {
        id: 'item-2',
        productId: 'product-2',
        productCode: 'NAT-002',
        productDescription: 'Kaiak',
        quantityOrdered: 3,
        quantityReceived: 0,
        catalogUnitPrice: '90.00',
        purchaseUnitPrice: '50.00',
        originalUnitPrice: '110.00',
        expirationDate: null,
        notes: null,
      },
    ],
    createdAt,
    updatedAt: createdAt,
  },
  {
    id: '1368f73e-d016-43ce-906e-13a5194ffb18',
    brand: {
      id: 'brand-id-2',
      name: 'Avon',
      active: true,
      createdAt,
      updatedAt: createdAt,
    },
    cycle: 'Ciclo 09',
    orderDate: '2026-07-10',
    receivedAt: createdAt,
    canceledAt: null,
    cancelReason: null,
    status: 'RECEIVED',
    notes: null,
    items: [],
    createdAt,
    updatedAt: createdAt,
  },
];

describe('OrderList', () => {
  it('renders order data, status, quantities and access actions', () => {
    render(
      <OrderList
        orders={orders}
        meta={{ page: 1, pageSize: 20, total: 2, totalPages: 1 }}
        query={{}}
      />,
    );

    expect(screen.getByText('Ciclo 10')).toBeVisible();
    expect(screen.getByText('20/07/2026')).toBeVisible();
    expect(screen.getByText('Em aberto')).toBeVisible();
    expect(screen.getByText('Recebido')).toBeVisible();
    expect(screen.getByText('2 produtos / 5 unidades')).toBeVisible();
    expect(
      screen.getByRole('link', { name: 'Abrir pedido Ciclo 10' }),
    ).toHaveAttribute(
      'href',
      '/orders/6a9028c4-b4dc-4132-b897-cd9e8049a33f/edit',
    );
  });

  it('preserves all filters in pagination links', () => {
    render(
      <OrderList
        orders={[orders[0]]}
        meta={{ page: 2, pageSize: 1, total: 3, totalPages: 3 }}
        query={{
          status: 'OPEN',
          brandId: 'brand-id',
          cycle: 'Ciclo 10',
          startDate: '2026-07-01',
          endDate: '2026-07-31',
        }}
      />,
    );

    expect(screen.getByText('Página 2 de 3')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Página anterior' })).toHaveAttribute(
      'href',
      '/orders?status=OPEN&brandId=brand-id&cycle=Ciclo+10&startDate=2026-07-01&endDate=2026-07-31&page=1',
    );
    expect(screen.getByRole('link', { name: 'Próxima página' })).toHaveAttribute(
      'href',
      '/orders?status=OPEN&brandId=brand-id&cycle=Ciclo+10&startDate=2026-07-01&endDate=2026-07-31&page=3',
    );
  });

  it('shows an empty state without pagination actions', () => {
    render(
      <OrderList
        orders={[]}
        meta={{ page: 1, pageSize: 20, total: 0, totalPages: 0 }}
        query={{ status: 'CANCELED' }}
      />,
    );

    expect(screen.getByText('Nenhum pedido encontrado.')).toBeVisible();
    expect(screen.queryByRole('link', { name: 'Próxima página' })).toBeNull();
  });
});
