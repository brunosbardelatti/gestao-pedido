import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DeactivateProductButton } from '@/components/products/deactivate-product-button';

const props = {
  productId: '6a9028c4-b4dc-4132-b897-cd9e8049a33f',
  productCode: 'PERF-001',
  initialActive: true,
};

describe('DeactivateProductButton', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('requires confirmation and allows canceling without contacting the API', async () => {
    const user = userEvent.setup();
    render(<DeactivateProductButton {...props} />);

    await user.click(screen.getByRole('button', { name: 'Inativar produto' }));

    expect(
      screen.getByRole('group', {
        name: 'Confirmar inativação de PERF-001',
      }),
    ).toBeVisible();
    expect(fetch).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(
      screen.getByRole('button', { name: 'Inativar produto' }),
    ).toBeVisible();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('deactivates the product and shows its persistent inactive state', async () => {
    const user = userEvent.setup();
    let resolveRequest: ((response: Response) => void) | undefined;
    vi.mocked(fetch).mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveRequest = resolve;
      }),
    );
    render(<DeactivateProductButton {...props} />);

    await user.click(screen.getByRole('button', { name: 'Inativar produto' }));
    await user.click(
      screen.getByRole('button', { name: 'Confirmar inativação' }),
    );

    expect(
      screen.getByRole('button', { name: 'Inativando produto' }),
    ).toBeDisabled();
    expect(fetch).toHaveBeenCalledWith(
      `http://localhost:3001/api/v1/products/${props.productId}/active`,
      expect.objectContaining({
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: false }),
      }),
    );

    await act(async () => {
      resolveRequest?.(
        new Response(
          JSON.stringify({
            data: { id: props.productId, code: 'PERF-001', active: false },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );
    });

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Produto PERF-001 inativado.',
    );
    expect(
      screen.queryByRole('button', { name: 'Inativar produto' }),
    ).toBeNull();
  });

  it('shows an API error and returns to the initial action', async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({ error: { message: 'Produto não encontrado.' } }),
        { status: 404, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    render(<DeactivateProductButton {...props} />);

    await user.click(screen.getByRole('button', { name: 'Inativar produto' }));
    await user.click(
      screen.getByRole('button', { name: 'Confirmar inativação' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Produto não encontrado.',
    );
    expect(
      screen.getByRole('button', { name: 'Inativar produto' }),
    ).toBeVisible();
  });
});
