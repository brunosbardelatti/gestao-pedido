import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CreateBrandForm } from '@/components/brands/create-brand-form';

describe('CreateBrandForm', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('validates the name before contacting the API', async () => {
    const user = userEvent.setup();
    render(<CreateBrandForm />);

    await user.type(screen.getByLabelText('Nome da marca'), '   ');
    await user.click(screen.getByRole('button', { name: 'Cadastrar marca' }));

    expect(await screen.findByText('Informe o nome da marca.')).toBeVisible();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('creates a trimmed brand and clears the form after success', async () => {
    const user = userEvent.setup();
    let resolveRequest: ((response: Response) => void) | undefined;
    vi.mocked(fetch).mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveRequest = resolve;
      }),
    );
    render(<CreateBrandForm />);

    await user.type(screen.getByLabelText('Nome da marca'), '  Natura  ');
    await user.click(screen.getByRole('button', { name: 'Cadastrar marca' }));

    expect(screen.getByRole('button', { name: 'Cadastrando marca' })).toBeDisabled();
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/v1/brands',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Natura' }),
      }),
    );

    await act(async () => {
      resolveRequest?.(
        new Response(
          JSON.stringify({
            data: {
              id: 'brand-id',
              name: 'Natura',
              active: true,
              createdAt: '2026-08-02T12:00:00.000Z',
              updatedAt: '2026-08-02T12:00:00.000Z',
            },
          }),
          { status: 201, headers: { 'Content-Type': 'application/json' } },
        ),
      );
    });

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Marca Natura cadastrada.',
    );
    expect(screen.getByLabelText('Nome da marca')).toHaveValue('');
  });

  it('shows the conflict returned by the API and preserves the name', async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: 'BRAND_ALREADY_EXISTS',
            message: 'Já existe uma marca com este nome.',
            requestId: 'req-123',
          },
        }),
        { status: 409, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    render(<CreateBrandForm />);

    await user.type(screen.getByLabelText('Nome da marca'), 'Natura');
    await user.click(screen.getByRole('button', { name: 'Cadastrar marca' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Já existe uma marca com este nome.',
    );
    expect(screen.getByLabelText('Nome da marca')).toHaveValue('Natura');
  });
});
