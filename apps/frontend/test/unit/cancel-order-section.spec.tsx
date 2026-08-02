import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CancelOrderSection } from '@/components/orders/cancel-order-section';

const props = {
  orderId: 'abfb53af-ec77-4551-9ab2-2e6caf4f24fb',
  cycle: '12/2026',
};

describe('CancelOrderSection', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('requires explicit confirmation and allows returning without a request', async () => {
    const user = userEvent.setup();
    render(<CancelOrderSection {...props} />);

    await user.click(screen.getByRole('button', { name: 'Cancelar pedido' }));

    expect(
      screen.getByRole('group', { name: 'Confirmar cancelamento do pedido' }),
    ).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Confirmar cancelamento' }),
    ).toBeDisabled();
    expect(fetch).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Voltar' }));

    expect(
      screen.getByRole('button', { name: 'Cancelar pedido' }),
    ).toBeVisible();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('cancels with a trimmed reason and shows the final state', async () => {
    const user = userEvent.setup();
    let resolveRequest: ((response: Response) => void) | undefined;
    vi.mocked(fetch).mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveRequest = resolve;
      }),
    );
    render(<CancelOrderSection {...props} />);

    await user.click(screen.getByRole('button', { name: 'Cancelar pedido' }));
    await user.type(
      screen.getByLabelText('Motivo do cancelamento'),
      '  Fornecedor cancelou a campanha  ',
    );
    await user.click(
      screen.getByRole('button', { name: 'Confirmar cancelamento' }),
    );

    expect(
      screen.getByRole('button', { name: 'Cancelando pedido' }),
    ).toBeDisabled();
    expect(fetch).toHaveBeenCalledWith(
      `http://localhost:3001/api/v1/orders/${props.orderId}/cancel`,
      {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Fornecedor cancelou a campanha' }),
      },
    );

    await act(async () => {
      resolveRequest?.(
        new Response(
          JSON.stringify({
            data: {
              id: props.orderId,
              cycle: props.cycle,
              status: 'CANCELED',
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );
    });

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Pedido do ciclo 12/2026 cancelado.',
    );
    expect(
      screen.queryByRole('button', { name: 'Cancelar pedido' }),
    ).toBeNull();
  });

  it('shows an API error and preserves the informed reason', async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          error: { message: 'Somente pedidos em aberto podem ser cancelados.' },
        }),
        { status: 422, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    render(<CancelOrderSection {...props} />);

    await user.click(screen.getByRole('button', { name: 'Cancelar pedido' }));
    await user.type(
      screen.getByLabelText('Motivo do cancelamento'),
      'Fornecedor indisponível',
    );
    await user.click(
      screen.getByRole('button', { name: 'Confirmar cancelamento' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Somente pedidos em aberto podem ser cancelados.',
    );
    expect(screen.getByLabelText('Motivo do cancelamento')).toHaveValue(
      'Fornecedor indisponível',
    );
  });
});
