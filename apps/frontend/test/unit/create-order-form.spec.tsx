import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CreateOrderForm } from '@/components/orders/create-order-form';
import type { ProductDetails } from '@/lib/products';

const naturaId = '26bf7359-befe-4eb9-bcc9-58fc72489be0';
const avonId = '15f77232-68f8-4605-8822-f39c6c5389ee';
const perfumeId = '6a9028c4-b4dc-4132-b897-cd9e8049a33f';
const avonProductId = '1368f73e-d016-43ce-906e-13a5194ffb18';
const createdAt = '2026-08-02T12:00:00.000Z';
const products: ProductDetails[] = [
  {
    id: perfumeId,
    brand: { id: naturaId, name: 'Natura', active: true },
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
    id: avonProductId,
    brand: { id: avonId, name: 'Avon', active: true },
    category: { id: 'category-id', name: 'Perfumaria', active: true },
    code: 'AVON-001',
    description: 'Far Away',
    catalogPrice: '119.90',
    purchasePrice: '69.00',
    originalPrice: '149.90',
    suggestedSalePrice: '139.90',
    active: true,
    createdAt,
    updatedAt: createdAt,
  },
];
const props = {
  brands: [
    { id: naturaId, name: 'Natura' },
    { id: avonId, name: 'Avon' },
  ],
  products,
  initialOrderDate: '2026-08-02',
};

async function fillValidOrder(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(screen.getByLabelText('Marca'), naturaId);
  await user.type(screen.getByLabelText('Ciclo'), '12/2026');
  await user.selectOptions(screen.getByLabelText('Produto do item 1'), perfumeId);
  await user.clear(screen.getByLabelText('Quantidade do item 1'));
  await user.type(screen.getByLabelText('Quantidade do item 1'), '2');
}

describe('CreateOrderForm', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('filters products by brand and fills the current price snapshots', async () => {
    const user = userEvent.setup();
    render(<CreateOrderForm {...props} />);

    await user.selectOptions(screen.getByLabelText('Marca'), naturaId);

    expect(screen.getByRole('option', { name: 'PERF-001 · Essencial feminino' })).toBeVisible();
    expect(screen.queryByRole('option', { name: 'AVON-001 · Far Away' })).toBeNull();

    await user.selectOptions(screen.getByLabelText('Produto do item 1'), perfumeId);

    expect(screen.getByLabelText('Preço de catálogo do item 1')).toHaveValue(
      '149.90',
    );
    expect(screen.getByLabelText('Preço de compra do item 1')).toHaveValue(
      '89.00',
    );
    expect(screen.getByLabelText('Preço original do item 1')).toHaveValue(
      '179.90',
    );
  });

  it('rejects duplicate products before contacting the API', async () => {
    const user = userEvent.setup();
    render(<CreateOrderForm {...props} />);
    await fillValidOrder(user);
    await user.click(screen.getByRole('button', { name: 'Adicionar item' }));
    await user.selectOptions(screen.getByLabelText('Produto do item 2'), perfumeId);
    await user.click(screen.getByRole('button', { name: 'Criar pedido' }));

    expect(
      await screen.findByText('Cada produto pode aparecer apenas uma vez.'),
    ).toBeVisible();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('creates an order with normalized snapshots and an idempotency key', async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            id: 'order-id',
            cycle: '12/2026',
            status: 'OPEN',
          },
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    render(<CreateOrderForm {...props} />);
    await fillValidOrder(user);
    await user.type(screen.getByLabelText('Observações do pedido'), ' Urgente ');
    await user.click(screen.getByRole('button', { name: 'Criar pedido' }));

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/v1/orders',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': expect.stringMatching(
            /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
          ),
        },
        body: JSON.stringify({
          brandId: naturaId,
          cycle: '12/2026',
          orderDate: '2026-08-02',
          notes: 'Urgente',
          items: [
            {
              productId: perfumeId,
              quantityOrdered: 2,
              catalogUnitPrice: '149.90',
              purchaseUnitPrice: '89.00',
              originalUnitPrice: '179.90',
            },
          ],
        }),
      }),
    );
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Pedido do ciclo 12/2026 criado.',
    );
  });

  it('reuses the idempotency key when the same payload is retried', async () => {
    const user = userEvent.setup();
    vi.mocked(fetch)
      .mockRejectedValueOnce(new Error('connection lost'))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ data: { id: 'order-id', cycle: '12/2026' } }),
          { status: 201, headers: { 'Content-Type': 'application/json' } },
        ),
      );
    render(<CreateOrderForm {...props} />);
    await fillValidOrder(user);

    await user.click(screen.getByRole('button', { name: 'Criar pedido' }));
    expect(await screen.findByRole('alert')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Criar pedido' }));

    await act(async () => undefined);
    const firstHeaders = vi.mocked(fetch).mock.calls[0]?.[1]?.headers as Record<
      string,
      string
    >;
    const secondHeaders = vi.mocked(fetch).mock.calls[1]?.[1]?.headers as Record<
      string,
      string
    >;
    expect(secondHeaders['Idempotency-Key']).toBe(
      firstHeaders['Idempotency-Key'],
    );
  });
});
