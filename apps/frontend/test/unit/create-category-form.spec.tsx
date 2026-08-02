import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CreateCategoryForm } from '@/components/categories/create-category-form';

describe('CreateCategoryForm', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('validates the name before contacting the API', async () => {
    const user = userEvent.setup();
    render(<CreateCategoryForm />);

    await user.type(screen.getByLabelText('Nome da categoria'), '   ');
    await user.click(
      screen.getByRole('button', { name: 'Cadastrar categoria' }),
    );

    expect(await screen.findByText('Informe o nome da categoria.')).toBeVisible();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('creates a trimmed category and clears the form after success', async () => {
    const user = userEvent.setup();
    let resolveRequest: ((response: Response) => void) | undefined;
    vi.mocked(fetch).mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveRequest = resolve;
      }),
    );
    render(<CreateCategoryForm />);

    await user.type(screen.getByLabelText('Nome da categoria'), '  Perfumaria  ');
    await user.click(
      screen.getByRole('button', { name: 'Cadastrar categoria' }),
    );

    expect(
      screen.getByRole('button', { name: 'Cadastrando categoria' }),
    ).toBeDisabled();
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/v1/categories',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Perfumaria' }),
      }),
    );

    await act(async () => {
      resolveRequest?.(
        new Response(
          JSON.stringify({
            data: {
              id: 'category-id',
              name: 'Perfumaria',
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
      'Categoria Perfumaria cadastrada.',
    );
    expect(
      screen.getByRole('link', { name: 'Editar Perfumaria' }),
    ).toHaveAttribute(
      'href',
      '/categories/category-id/edit?name=Perfumaria',
    );
    expect(screen.getByLabelText('Nome da categoria')).toHaveValue('');
  });

  it('shows the conflict returned by the API and preserves the name', async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: 'CATEGORY_ALREADY_EXISTS',
            message: 'Já existe uma categoria com este nome.',
            requestId: 'req-123',
          },
        }),
        { status: 409, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    render(<CreateCategoryForm />);

    await user.type(screen.getByLabelText('Nome da categoria'), 'Perfumaria');
    await user.click(
      screen.getByRole('button', { name: 'Cadastrar categoria' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Já existe uma categoria com este nome.',
    );
    expect(screen.getByLabelText('Nome da categoria')).toHaveValue('Perfumaria');
  });
});
