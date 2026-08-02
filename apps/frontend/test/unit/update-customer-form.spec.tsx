import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UpdateCustomerForm } from '@/components/customers/update-customer-form';

const initialValues = {
  name: 'Maria Original',
  cpf: '12345678901',
  phone: '',
  addressLine: 'Rua Antiga, 1',
  city: 'Sao Paulo',
  state: 'SP',
  postalCode: '01001000',
};

describe('UpdateCustomerForm', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('renders the complete current profile', () => {
    render(
      <UpdateCustomerForm customerId="customer-id" initialValues={initialValues} />,
    );

    expect(screen.getByLabelText('Nome')).toHaveValue('Maria Original');
    expect(screen.getByLabelText('CPF')).toHaveValue('12345678901');
    expect(screen.getByLabelText('Endereço')).toHaveValue('Rua Antiga, 1');
    expect(screen.getByLabelText('UF')).toHaveValue('SP');
  });

  it('updates normalized values and explicitly clears optional fields', async () => {
    const user = userEvent.setup();
    let resolveRequest: ((response: Response) => void) | undefined;
    vi.mocked(fetch).mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveRequest = resolve;
      }),
    );
    render(
      <UpdateCustomerForm customerId="customer-id" initialValues={initialValues} />,
    );

    await user.clear(screen.getByLabelText('Nome'));
    await user.type(screen.getByLabelText('Nome'), ' Maria Atualizada ');
    await user.clear(screen.getByLabelText('CPF'));
    await user.clear(screen.getByLabelText('Endereço'));
    await user.clear(screen.getByLabelText('Cidade'));
    await user.type(screen.getByLabelText('Cidade'), ' Campinas ');
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(
      screen.getByRole('button', { name: 'Salvando alterações' }),
    ).toBeDisabled();
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/v1/customers/customer-id',
      expect.objectContaining({
        method: 'PUT',
        credentials: 'include',
        body: JSON.stringify({
          name: 'Maria Atualizada',
          cpf: null,
          phone: null,
          addressLine: null,
          city: 'Campinas',
          state: 'SP',
          postalCode: '01001000',
        }),
      }),
    );

    await act(async () => {
      resolveRequest?.(
        new Response(
          JSON.stringify({
            data: { id: 'customer-id', name: 'Maria Atualizada' },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );
    });
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Cliente Maria Atualizada atualizado.',
    );
    expect(screen.getByLabelText('Nome')).toHaveValue('Maria Atualizada');
  });

  it('preserves the current data when the API rejects the update', async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          error: { message: 'Já existe um cliente com este CPF.' },
        }),
        { status: 409, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    render(
      <UpdateCustomerForm customerId="customer-id" initialValues={initialValues} />,
    );

    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Já existe um cliente com este CPF.',
    );
    expect(screen.getByLabelText('Nome')).toHaveValue('Maria Original');
  });
});
