import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdjustStockForm } from '@/components/inventory/adjust-stock-form';

const products = [
  {
    id: '6a9028c4-b4dc-4132-b897-cd9e8049a33f',
    code: 'PERF-001',
    description: 'Essencial feminino',
    balance: 2,
  },
];

describe('AdjustStockForm', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.stubGlobal('crypto', { randomUUID: () => 'idempotency-key' });
  });

  it('requires explicit confirmation when the projected stock is negative', async () => {
    const user = userEvent.setup();
    render(<AdjustStockForm products={products} />);

    await user.selectOptions(screen.getByLabelText('Produto'), products[0].id);
    await user.selectOptions(screen.getByLabelText('Tipo de ajuste'), 'PERSONAL_USE');
    await user.clear(screen.getByLabelText('Quantidade'));
    await user.type(screen.getByLabelText('Quantidade'), '-4');
    await user.type(screen.getByLabelText('Motivo'), 'Uso em demonstração');

    expect(screen.getByText('Saldo atual:').closest('p')).toHaveTextContent(
      'Saldo atual: 2 unidades',
    );
    expect(screen.getByText('Saldo projetado:').closest('p')).toHaveTextContent(
      'Saldo projetado: -2 unidades',
    );
    expect(screen.getByText('Este ajuste deixará o estoque negativo.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Registrar ajuste' })).toBeDisabled();

    await user.click(screen.getByLabelText('Confirmo o saldo negativo'));
    expect(screen.getByRole('button', { name: 'Registrar ajuste' })).toBeEnabled();
  });

  it('submits normalized data with an idempotency key', async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            id: 'movement-id',
            productId: products[0].id,
            quantityDelta: 3,
          },
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    render(<AdjustStockForm products={products} />);

    await user.selectOptions(screen.getByLabelText('Produto'), products[0].id);
    await user.selectOptions(screen.getByLabelText('Tipo de ajuste'), 'RETURN');
    await user.clear(screen.getByLabelText('Quantidade'));
    await user.type(screen.getByLabelText('Quantidade'), '3');
    await user.type(screen.getByLabelText('Motivo'), '  Devolução da cliente  ');
    await user.click(screen.getByRole('button', { name: 'Registrar ajuste' }));

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/v1/inventory/adjustments',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': 'idempotency-key',
        },
        body: JSON.stringify({
          productId: products[0].id,
          type: 'RETURN',
          quantityDelta: 3,
          reason: 'Devolução da cliente',
          confirmNegativeStock: false,
        }),
      }),
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'Ajuste de +3 unidades registrado para PERF-001.',
    );
  });

  it('shows an API error without clearing the informed adjustment', async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          error: { message: 'Não foi possível registrar o ajuste.' },
        }),
        { status: 422, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    render(<AdjustStockForm products={products} />);

    await user.selectOptions(screen.getByLabelText('Produto'), products[0].id);
    await user.clear(screen.getByLabelText('Quantidade'));
    await user.type(screen.getByLabelText('Quantidade'), '1');
    await user.type(screen.getByLabelText('Motivo'), 'Contagem física');
    await user.click(screen.getByRole('button', { name: 'Registrar ajuste' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível registrar o ajuste.',
    );
    expect(screen.getByLabelText('Motivo')).toHaveValue('Contagem física');
  });
});
