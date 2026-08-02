import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CustomerList } from '@/components/customers/customer-list';

const customers = [
  {
    id: 'customer-1',
    name: 'Maria Almeida',
    cpf: '12345678901',
    phone: '11999998888',
    addressLine: null,
    city: 'Campinas',
    state: 'SP',
    postalCode: null,
    active: true,
    createdAt: '2026-08-02T12:00:00.000Z',
    updatedAt: '2026-08-02T12:00:00.000Z',
  },
  {
    id: 'customer-2',
    name: 'Ana Souza',
    cpf: null,
    phone: null,
    addressLine: null,
    city: null,
    state: null,
    postalCode: null,
    active: false,
    createdAt: '2026-08-02T12:00:00.000Z',
    updatedAt: '2026-08-02T12:00:00.000Z',
  },
];

describe('CustomerList', () => {
  it('renders customer identity, contact, location, status and edit actions', () => {
    render(
      <CustomerList
        customers={customers}
        meta={{ page: 1, pageSize: 20, total: 2, totalPages: 1 }}
        query={{ page: 1 }}
      />,
    );

    expect(screen.getByText('Maria Almeida')).toBeVisible();
    expect(screen.getByText('12345678901')).toBeVisible();
    expect(screen.getByText('11999998888')).toBeVisible();
    expect(screen.getByText('Campinas / SP')).toBeVisible();
    expect(screen.getByText('Ativo')).toBeVisible();
    expect(screen.getByText('Inativo')).toBeVisible();
    expect(
      screen.getByRole('link', { name: 'Editar cliente Maria Almeida' }),
    ).toHaveAttribute('href', '/customers/customer-1/edit');
  });

  it('renders the empty state', () => {
    render(
      <CustomerList
        customers={[]}
        meta={{ page: 1, pageSize: 20, total: 0, totalPages: 0 }}
        query={{ search: 'inexistente', page: 1 }}
      />,
    );

    expect(screen.getByText('Nenhum cliente encontrado.')).toBeVisible();
  });

  it('preserves filters in pagination links', () => {
    render(
      <CustomerList
        customers={customers}
        meta={{ page: 2, pageSize: 2, total: 6, totalPages: 3 }}
        query={{ search: 'maria', cpf: '12345678901', phone: '9999', page: 2 }}
      />,
    );

    expect(screen.getByRole('link', { name: 'Página anterior' })).toHaveAttribute(
      'href',
      '/customers?search=maria&cpf=12345678901&phone=9999&page=1',
    );
    expect(screen.getByRole('link', { name: 'Próxima página' })).toHaveAttribute(
      'href',
      '/customers?search=maria&cpf=12345678901&phone=9999&page=3',
    );
  });
});
