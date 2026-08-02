import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LoginForm } from '@/components/auth/login-form';

const replace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
}));

describe('LoginForm', () => {
  beforeEach(() => {
    replace.mockReset();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('validates the fields before contacting the API', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText('Login'), 'ana');
    await user.type(screen.getByLabelText('Senha'), 'curta');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(
      await screen.findByText('A senha deve ter pelo menos 8 caracteres.'),
    ).toBeVisible();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('sends credentials with cookies and redirects after success', async () => {
    const user = userEvent.setup();
    let resolveRequest: ((response: Response) => void) | undefined;
    vi.mocked(fetch).mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveRequest = resolve;
      }),
    );
    render(<LoginForm />);

    await user.type(screen.getByLabelText('Login'), 'ana');
    await user.type(screen.getByLabelText('Senha'), 'correct-password');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(screen.getByRole('button', { name: 'Entrando' })).toBeDisabled();
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/v1/auth/login',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: 'ana', password: 'correct-password' }),
      }),
    );

    await act(async () => {
      resolveRequest?.(
        new Response(JSON.stringify({ data: { id: 'user-id' } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    });

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
  });

  it('shows a generic message when the credentials are rejected', async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Login ou senha inválidos.',
            requestId: 'req-123',
          },
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    render(<LoginForm />);

    await user.type(screen.getByLabelText('Login'), 'ana');
    await user.type(screen.getByLabelText('Senha'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Login ou senha inválidos.',
    );
    expect(replace).not.toHaveBeenCalled();
  });
});
