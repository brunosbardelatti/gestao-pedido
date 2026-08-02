import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UpdateCategoryForm } from '@/components/categories/update-category-form';

const replace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
}));

describe('UpdateCategoryForm', () => {
  beforeEach(() => {
    replace.mockReset();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('shows the current name and validates before contacting the API', async () => {
    const user = userEvent.setup();
    render(
      <UpdateCategoryForm
        categoryId="category-id"
        initialName="Perfumaria"
      />,
    );

    expect(screen.getByLabelText('Nome da categoria')).toHaveValue('Perfumaria');
    await user.clear(screen.getByLabelText('Nome da categoria'));
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(await screen.findByText('Informe o nome da categoria.')).toBeVisible();
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
    render(
      <UpdateCategoryForm
        categoryId="category-id"
        initialName="Perfumaria"
      />,
    );

    await user.clear(screen.getByLabelText('Nome da categoria'));
    await user.type(
      screen.getByLabelText('Nome da categoria'),
      '  Perfumaria Feminina  ',
    );
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(
      screen.getByRole('button', { name: 'Salvando alterações' }),
    ).toBeDisabled();
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/v1/categories/category-id',
      expect.objectContaining({
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Perfumaria Feminina' }),
      }),
    );

    await act(async () => {
      resolveRequest?.(
        new Response(
          JSON.stringify({
            data: {
              id: 'category-id',
              name: 'Perfumaria Feminina',
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
      'Categoria Perfumaria Feminina atualizada.',
    );
    expect(screen.getByLabelText('Nome da categoria')).toHaveValue(
      'Perfumaria Feminina',
    );
    expect(replace).toHaveBeenCalledWith(
      '/categories/category-id/edit?name=Perfumaria%20Feminina&active=true',
      { scroll: false },
    );
  });

  it('shows an API conflict and preserves the informed name', async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: 'CATEGORY_ALREADY_EXISTS',
            message: 'Já existe uma categoria com este nome.',
          },
        }),
        { status: 409, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    render(
      <UpdateCategoryForm
        categoryId="category-id"
        initialName="Maquiagem"
      />,
    );

    await user.clear(screen.getByLabelText('Nome da categoria'));
    await user.type(screen.getByLabelText('Nome da categoria'), 'Perfumaria');
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Já existe uma categoria com este nome.',
    );
    expect(screen.getByLabelText('Nome da categoria')).toHaveValue('Perfumaria');
    expect(replace).not.toHaveBeenCalled();
  });
});
