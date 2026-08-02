import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CreateSaleForm } from '@/components/sales/create-sale-form';

const productA = '26bf7359-befe-4eb9-bcc9-58fc72489be0';
const productB = 'bfab0010-f11e-4e5f-ad4b-a531c32b6472';
const products = [
  {
    id: productA,
    code: 'PERF-1',
    description: 'Perfume Floral',
    suggestedSalePrice: '12.00',
    balance: 5,
  },
  {
    id: productB,
    code: 'SAB-1',
    description: 'Sabonete',
    suggestedSalePrice: '4.50',
    balance: 1,
  },
];
const customers = [
  { id: '99f32ed5-6b49-4452-9266-56fbc8a433d6', name: 'Maria Cliente' },
];

describe('CreateSaleForm', () => {
  beforeEach(() => {
    let uuidSequence = 0;
    vi.stubGlobal('fetch', vi.fn());
    vi.stubGlobal('crypto', {
      randomUUID: vi.fn(
        () =>
          `00000000-0000-4000-8000-${String(++uuidSequence).padStart(12, '0')}`,
      ),
    });
  });

  it('suggests the registered price and calculates the cart total', async () => {
    const user = userEvent.setup();
    render(<CreateSaleForm products={products} customers={customers} />);

    await user.selectOptions(screen.getByLabelText('Produto do item 1'), productA);
    await user.clear(screen.getByLabelText('Quantidade do item 1'));
    await user.type(screen.getByLabelText('Quantidade do item 1'), '2');

    expect(screen.getByLabelText('Preço unitário do item 1')).toHaveValue('12.00');
    expect(screen.getByText('Saldo atual: 5')).toBeVisible();
    expect(screen.getByText('R$ 24,00')).toBeVisible();
  });

  it('rejects duplicate products before contacting the API', async () => {
    const user = userEvent.setup();
    render(<CreateSaleForm products={products} customers={customers} />);

    await user.selectOptions(screen.getByLabelText('Produto do item 1'), productA);
    await user.click(screen.getByRole('button', { name: 'Adicionar item' }));
    await user.selectOptions(screen.getByLabelText('Produto do item 2'), productA);
    await user.click(screen.getByRole('button', { name: 'Registrar venda' }));

    expect(
      await screen.findByText('Cada produto pode aparecer apenas uma vez.'),
    ).toBeVisible();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('requires explicit confirmation when projected stock is negative', async () => {
    const user = userEvent.setup();
    render(<CreateSaleForm products={products} customers={customers} />);

    await user.selectOptions(screen.getByLabelText('Produto do item 1'), productB);
    await user.clear(screen.getByLabelText('Quantidade do item 1'));
    await user.type(screen.getByLabelText('Quantidade do item 1'), '2');

    expect(screen.getByRole('alert')).toHaveTextContent(
      'A venda deixará 1 unidade abaixo de zero.',
    );
    expect(screen.getByRole('button', { name: 'Registrar venda' })).toBeDisabled();
    await user.click(
      screen.getByLabelText('Confirmo a venda mesmo com estoque negativo.'),
    );
    expect(screen.getByRole('button', { name: 'Registrar venda' })).toBeEnabled();
  });

  it('submits normalized snapshots and reuses the key for the same retry', async () => {
    const user = userEvent.setup();
    let resolveRequest: ((response: Response) => void) | undefined;
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { message: 'Falha temporária.' } }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockReturnValueOnce(
        new Promise<Response>((resolve) => {
          resolveRequest = resolve;
        }),
      );
    render(<CreateSaleForm products={products} customers={customers} />);

    await user.selectOptions(screen.getByLabelText('Cliente'), customers[0]!.id);
    await user.selectOptions(screen.getByLabelText('Forma de pagamento'), 'PIX');
    await user.type(screen.getByLabelText('Observações'), ' Entregar amanhã ');
    await user.selectOptions(screen.getByLabelText('Produto do item 1'), productA);
    await user.clear(screen.getByLabelText('Quantidade do item 1'));
    await user.type(screen.getByLabelText('Quantidade do item 1'), '2');
    await user.clear(screen.getByLabelText('Preço unitário do item 1'));
    await user.type(screen.getByLabelText('Preço unitário do item 1'), '11,5');
    await user.click(screen.getByRole('button', { name: 'Registrar venda' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Falha temporária.');
    await user.click(screen.getByRole('button', { name: 'Registrar venda' }));

    expect(fetch).toHaveBeenNthCalledWith(
      2,
      'http://localhost:3001/api/v1/sales',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': expect.any(String),
        },
        body: JSON.stringify({
          customerId: customers[0]!.id,
          paymentMethod: 'PIX',
          notes: 'Entregar amanhã',
          confirmNegativeStock: false,
          items: [{ productId: productA, quantity: 2, unitPrice: '11.50' }],
        }),
      }),
    );

    await act(async () => {
      resolveRequest?.(
        new Response(
          JSON.stringify({ data: { id: 'sale-id', total: '23.00' } }),
          { status: 201, headers: { 'Content-Type': 'application/json' } },
        ),
      );
    });
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Venda registrada no total de R$ 23,00.',
    );
    const firstHeaders = vi.mocked(fetch).mock.calls[0]?.[1]?.headers;
    const secondHeaders = vi.mocked(fetch).mock.calls[1]?.[1]?.headers;
    expect(secondHeaders).toEqual(firstHeaders);
  });
});
