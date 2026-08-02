import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UpdateBrandForm } from '@/components/brands/update-brand-form';

const replace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
}));

describe('UpdateBrandForm', () => {
  beforeEach(() => {
    replace.mockReset();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('shows the current name and validates before contacting the API', async () => {
    const user = userEvent.setup();
    render(<UpdateBrandForm brandId="brand-id" initialName="Natura" />);

    expect(screen.getByLabelText('Nome da marca')).toHaveValue('Natura');
    await user.clear(screen.getByLabelText('Nome da marca'));
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(await screen.findByText('Informe o nome da marca.')).toBeVisible();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('updates a trimmed name and synchronizes the route after success', async () => {
    const user = userEvent.setup();
    let resolveRequest: ((response: Response) => void) | undefined;
    vi.mocked(fetch).mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveRequest = resolve;
      }),
    );
    render(<UpdateBrandForm brandId="brand-id" initialName="Natura" />);

    await user.clear(screen.getByLabelText('Nome da marca'));
    await user.type(screen.getByLabelText('Nome da marca'), '  Natura Brasil  ');
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(
      screen.getByRole('button', { name: 'Salvando alterações' }),
    ).toBeDisabled();
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/v1/brands/brand-id',
      expect.objectContaining({
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Natura Brasil' }),
      }),
    );

    await act(async () => {
      resolveRequest?.(
        new Response(
          JSON.stringify({
            data: {
              id: 'brand-id',
              name: 'Natura Brasil',
              active: true,
              createdAt: '2026-08-02T12:00:00.000Z',
              updatedAt: '2026-08-02T15:00:00.000Z',
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );
    });

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Marca Natura Brasil atualizada.',
    );
    expect(screen.getByLabelText('Nome da marca')).toHaveValue('Natura Brasil');
    expect(replace).toHaveBeenCalledWith(
      '/brands/brand-id/edit?name=Natura%20Brasil&active=true',
      { scroll: false },
    );
  });

  it('shows an API conflict and preserves the informed name', async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: 'BRAND_ALREADY_EXISTS',
            message: 'Já existe uma marca com este nome.',
          },
        }),
        { status: 409, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    render(<UpdateBrandForm brandId="brand-id" initialName="Avon" />);

    await user.clear(screen.getByLabelText('Nome da marca'));
    await user.type(screen.getByLabelText('Nome da marca'), 'Natura');
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Já existe uma marca com este nome.',
    );
    expect(screen.getByLabelText('Nome da marca')).toHaveValue('Natura');
    expect(replace).not.toHaveBeenCalled();
  });
});
