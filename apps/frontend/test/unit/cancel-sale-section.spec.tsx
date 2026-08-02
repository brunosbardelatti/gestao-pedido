import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CancelSaleSection } from '@/components/sales/cancel-sale-section';

const props = {
  saleId: 'abfb53af-ec77-4551-9ab2-2e6caf4f24fb',
  total: '24.00',
};

describe('CancelSaleSection', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('requires a reason and explicit confirmation before requesting', async () => {
    const user = userEvent.setup();
    render(<CancelSaleSection {...props} />);

    await user.click(screen.getByRole('button', { name: 'Cancelar venda' }));
    expect(
      screen.getByRole('group', { name: 'Confirmar cancelamento da venda' }),
    ).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Confirmar cancelamento' }),
    ).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(fetch).not.toHaveBeenCalled();
  });

  it('cancels with an idempotency key and renders the final state', async () => {
    const user = userEvent.setup();
    let resolveRequest: ((response: Response) => void) | undefined;
    vi.mocked(fetch).mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveRequest = resolve;
      }),
    );
    render(<CancelSaleSection {...props} />);

    await user.click(screen.getByRole('button', { name: 'Cancelar venda' }));
    await user.type(
      screen.getByLabelText('Motivo do cancelamento'),
      '  Cliente desistiu  ',
    );
    await user.click(
      screen.getByRole('button', { name: 'Confirmar cancelamento' }),
    );

    expect(fetch).toHaveBeenCalledWith(
      `http://localhost:3001/api/v1/sales/${props.saleId}/cancel`,
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': expect.any(String),
        },
        body: JSON.stringify({ reason: 'Cliente desistiu' }),
      }),
    );
    await act(async () => {
      resolveRequest?.(
        new Response(
          JSON.stringify({
            data: { id: props.saleId, status: 'CANCELED', total: props.total },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );
    });
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Venda de R$ 24,00 cancelada. O estoque foi recomposto.',
    );
  });

  it('preserves the reason and reuses the key when retrying an error', async () => {
    const user = userEvent.setup();
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { message: 'Falha temporária.' } }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ data: { id: props.saleId, status: 'CANCELED' } }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );
    render(<CancelSaleSection {...props} />);
    await user.click(screen.getByRole('button', { name: 'Cancelar venda' }));
    await user.type(screen.getByLabelText('Motivo do cancelamento'), 'Erro do cliente');
    await user.click(screen.getByRole('button', { name: 'Confirmar cancelamento' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Falha temporária.');
    await user.click(screen.getByRole('button', { name: 'Confirmar cancelamento' }));

    const firstHeaders = vi.mocked(fetch).mock.calls[0]?.[1]?.headers;
    const secondHeaders = vi.mocked(fetch).mock.calls[1]?.[1]?.headers;
    expect(secondHeaders).toEqual(firstHeaders);
  });
});
