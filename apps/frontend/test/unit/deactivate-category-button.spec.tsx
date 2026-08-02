import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DeactivateCategoryButton } from '@/components/categories/deactivate-category-button';

const replace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
}));

describe('DeactivateCategoryButton', () => {
  beforeEach(() => {
    replace.mockReset();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('requires confirmation and allows canceling without contacting the API', async () => {
    const user = userEvent.setup();
    render(
      <DeactivateCategoryButton
        categoryId="category-id"
        categoryName="Perfumaria"
        initialActive
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Inativar categoria' }));

    expect(
      screen.getByRole('group', {
        name: 'Confirmar inativação de Perfumaria',
      }),
    ).toBeVisible();
    expect(fetch).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(
      screen.getByRole('button', { name: 'Inativar categoria' }),
    ).toBeVisible();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('deactivates the category and persists the inactive route state', async () => {
    const user = userEvent.setup();
    let resolveRequest: ((response: Response) => void) | undefined;
    vi.mocked(fetch).mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveRequest = resolve;
      }),
    );
    render(
      <DeactivateCategoryButton
        categoryId="category-id"
        categoryName="Perfumaria Feminina"
        initialActive
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Inativar categoria' }));
    await user.click(
      screen.getByRole('button', { name: 'Confirmar inativação' }),
    );

    expect(
      screen.getByRole('button', { name: 'Inativando categoria' }),
    ).toBeDisabled();
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/v1/categories/category-id/active',
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
            data: {
              id: 'category-id',
              name: 'Perfumaria Feminina',
              active: false,
              createdAt: '2026-08-02T12:00:00.000Z',
              updatedAt: '2026-08-02T16:00:00.000Z',
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );
    });

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Categoria Perfumaria Feminina inativada.',
    );
    expect(
      screen.queryByRole('button', { name: 'Inativar categoria' }),
    ).toBeNull();
    expect(replace).toHaveBeenCalledWith(
      '/categories/category-id/edit?name=Perfumaria%20Feminina&active=false',
      { scroll: false },
    );
  });

  it('shows the API error and returns to the initial action', async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: 'CATEGORY_NOT_FOUND',
            message: 'Categoria não encontrada.',
          },
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    render(
      <DeactivateCategoryButton
        categoryId="category-id"
        categoryName="Perfumaria"
        initialActive
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Inativar categoria' }));
    await user.click(
      screen.getByRole('button', { name: 'Confirmar inativação' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Categoria não encontrada.',
    );
    expect(
      screen.getByRole('button', { name: 'Inativar categoria' }),
    ).toBeVisible();
    expect(replace).not.toHaveBeenCalled();
  });
});
