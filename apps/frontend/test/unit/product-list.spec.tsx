import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ProductList } from '@/components/products/product-list';
import type { ProductDetails } from '@/lib/products';

const createdAt = '2026-08-02T12:00:00.000Z';
const products: ProductDetails[] = [
  {
    id: '6a9028c4-b4dc-4132-b897-cd9e8049a33f',
    brand: { id: 'brand-id', name: 'Natura', active: true },
    category: { id: 'category-id', name: 'Perfumaria', active: true },
    code: 'PERF-001',
    description: 'Essencial feminino',
    catalogPrice: '149.90',
    purchasePrice: '89.00',
    originalPrice: '179.90',
    suggestedSalePrice: '169.90',
    active: true,
    createdAt,
    updatedAt: createdAt,
  },
  {
    id: '1368f73e-d016-43ce-906e-13a5194ffb18',
    brand: { id: 'brand-id', name: 'Natura', active: true },
    category: { id: 'category-id', name: 'Perfumaria', active: true },
    code: 'PERF-002',
    description: 'Kaiak masculino',
    catalogPrice: '129.90',
    purchasePrice: '79.00',
    originalPrice: '159.90',
    suggestedSalePrice: null,
    active: false,
    createdAt,
    updatedAt: createdAt,
  },
];

describe('ProductList', () => {
  it('renders catalog data, status and edit actions', () => {
    render(
      <ProductList
        products={products}
        meta={{ page: 1, pageSize: 20, total: 2, totalPages: 1 }}
        query={{}}
      />,
    );

    expect(screen.getByText('Essencial feminino')).toBeVisible();
    expect(screen.getByText('R$ 169,90')).toBeVisible();
    expect(screen.getByText('Sem preço sugerido')).toBeVisible();
    expect(screen.getByText('Ativo')).toBeVisible();
    expect(screen.getByText('Inativo')).toBeVisible();
    expect(
      screen.getByRole('link', { name: 'Editar produto PERF-001' }),
    ).toHaveAttribute(
      'href',
      '/products/6a9028c4-b4dc-4132-b897-cd9e8049a33f/edit',
    );
  });

  it('preserves filters in pagination links', () => {
    render(
      <ProductList
        products={[products[0]]}
        meta={{ page: 2, pageSize: 1, total: 3, totalPages: 3 }}
        query={{
          search: 'perf',
          brandId: 'brand-id',
          active: false,
        }}
      />,
    );

    expect(screen.getByText('Página 2 de 3')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Página anterior' })).toHaveAttribute(
      'href',
      '/products?search=perf&brandId=brand-id&active=false&page=1',
    );
    expect(screen.getByRole('link', { name: 'Próxima página' })).toHaveAttribute(
      'href',
      '/products?search=perf&brandId=brand-id&active=false&page=3',
    );
  });

  it('shows an empty state without pagination actions', () => {
    render(
      <ProductList
        products={[]}
        meta={{ page: 1, pageSize: 20, total: 0, totalPages: 0 }}
        query={{ search: 'inexistente' }}
      />,
    );

    expect(screen.getByText('Nenhum produto encontrado.')).toBeVisible();
    expect(screen.queryByRole('link', { name: 'Próxima página' })).toBeNull();
  });
});
