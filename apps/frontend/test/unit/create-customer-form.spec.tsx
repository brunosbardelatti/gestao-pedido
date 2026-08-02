import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CreateCustomerForm } from '@/components/customers/create-customer-form';

describe('CreateCustomerForm', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('validates required and formatted fields before contacting the API', async () => {
    const user = userEvent.setup();
    render(<CreateCustomerForm />);

    await user.type(screen.getByLabelText('Nome'), '   ');
    await user.type(screen.getByLabelText('CPF'), '123');
    await user.type(screen.getByLabelText('UF'), 'S');
    await user.type(screen.getByLabelText('CEP'), '01001-000');
    await user.click(screen.getByRole('button', { name: 'Cadastrar cliente' }));

    expect(await screen.findByText('Informe o nome do cliente.')).toBeVisible();
    expect(screen.getByText('Informe os 11 dígitos do CPF.')).toBeVisible();
    expect(screen.getByText('Informe uma UF com 2 letras.')).toBeVisible();
    expect(screen.getByText('Informe os 8 dígitos do CEP.')).toBeVisible();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('creates a normalized customer and clears the form after success', async () => {
    const user = userEvent.setup();
    let resolveRequest: ((response: Response) => void) | undefined;
    vi.mocked(fetch).mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveRequest = resolve;
      }),
    );
    render(<CreateCustomerForm />);

    await user.type(screen.getByLabelText('Nome'), '  Maria da Silva  ');
    await user.type(screen.getByLabelText('CPF'), '12345678901');
    await user.type(screen.getByLabelText('Telefone'), ' 11999998888 ');
    await user.type(screen.getByLabelText('Endereço'), ' Rua das Flores, 10 ');
    await user.type(screen.getByLabelText('Cidade'), ' Sao Paulo ');
    await user.type(screen.getByLabelText('UF'), 'sp');
    await user.type(screen.getByLabelText('CEP'), '01001000');
    await user.click(screen.getByRole('button', { name: 'Cadastrar cliente' }));

    expect(
      screen.getByRole('button', { name: 'Cadastrando cliente' }),
    ).toBeDisabled();
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/v1/customers',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Maria da Silva',
          cpf: '12345678901',
          phone: '11999998888',
          addressLine: 'Rua das Flores, 10',
          city: 'Sao Paulo',
          state: 'SP',
          postalCode: '01001000',
        }),
      }),
    );

    await act(async () => {
      resolveRequest?.(
        new Response(
          JSON.stringify({
            data: {
              id: 'customer-id',
              name: 'Maria da Silva',
              active: true,
            },
          }),
          { status: 201, headers: { 'Content-Type': 'application/json' } },
        ),
      );
    });

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Cliente Maria da Silva cadastrado.',
    );
    expect(
      screen.getByRole('link', { name: 'Editar Maria da Silva' }),
    ).toHaveAttribute('href', '/customers/customer-id/edit');
    expect(screen.getByLabelText('Nome')).toHaveValue('');
  });

  it('sends blank optional fields as null and preserves data after an API error', async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: 'CUSTOMER_CPF_ALREADY_EXISTS',
            message: 'Já existe um cliente com este CPF.',
          },
        }),
        { status: 409, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    render(<CreateCustomerForm />);

    await user.type(screen.getByLabelText('Nome'), 'Maria');
    await user.click(screen.getByRole('button', { name: 'Cadastrar cliente' }));

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/v1/customers',
      expect.objectContaining({
        body: JSON.stringify({
          name: 'Maria',
          cpf: null,
          phone: null,
          addressLine: null,
          city: null,
          state: null,
          postalCode: null,
        }),
      }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Já existe um cliente com este CPF.',
    );
    expect(screen.getByLabelText('Nome')).toHaveValue('Maria');
  });
});
