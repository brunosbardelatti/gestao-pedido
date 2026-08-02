import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LogoutButton } from '@/components/auth/logout-button';

const replace = vi.fn();
const refresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, refresh }),
}));

describe('LogoutButton', () => {
  beforeEach(() => {
    replace.mockReset();
    refresh.mockReset();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('ends the session and redirects to login', async () => {
    const user = userEvent.setup();
    let resolveRequest: ((response: Response) => void) | undefined;
    vi.mocked(fetch).mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveRequest = resolve;
      }),
    );
    render(<LogoutButton />);

    await user.click(screen.getByRole('button', { name: 'Sair' }));

    expect(screen.getByRole('button', { name: 'Saindo' })).toBeDisabled();
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/v1/auth/logout',
      {
        method: 'POST',
        credentials: 'include',
      },
    );

    await act(async () => {
      resolveRequest?.(new Response(null, { status: 204 }));
    });

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login'));
    expect(refresh).toHaveBeenCalledOnce();
  });

  it('keeps the user on the page when logout fails', async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 500 }));
    render(<LogoutButton />);

    await user.click(screen.getByRole('button', { name: 'Sair' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível encerrar a sessão.',
    );
    expect(screen.getByRole('button', { name: 'Sair' })).toBeEnabled();
    expect(replace).not.toHaveBeenCalled();
  });
});
