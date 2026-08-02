import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CreateProductForm } from '@/components/products/create-product-form';

const brandId = '26bf7359-befe-4eb9-bcc9-58fc72489be0';
const categoryId = 'bfab0010-f11e-4e5f-ad4b-a531c32b6472';
const references = {
  brands: [{ id: brandId, name: 'Natura' }],
  categories: [{ id: categoryId, name: 'Perfumaria' }],
};

describe('CreateProductForm', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('validates required fields before contacting the API', async () => {
    const user = userEvent.setup();
    render(<CreateProductForm {...references} />);

    await user.click(screen.getByRole('button', { name: 'Cadastrar produto' }));

    expect(await screen.findByText('Selecione a marca.')).toBeVisible();
    expect(screen.getByText('Selecione a categoria.')).toBeVisible();
    expect(screen.getByText('Informe o código do produto.')).toBeVisible();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('creates a product with normalized prices and optional suggested price', async () => {
    const user = userEvent.setup();
    let resolveRequest: ((response: Response) => void) | undefined;
    vi.mocked(fetch).mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveRequest = resolve;
      }),
    );
    render(<CreateProductForm {...references} />);

    await user.selectOptions(screen.getByLabelText('Marca'), brandId);
    await user.selectOptions(screen.getByLabelText('Categoria'), categoryId);
    await user.type(screen.getByLabelText('Código do produto'), '  PERF-001  ');
    await user.type(
      screen.getByLabelText('Descrição'),
      '  Essencial feminino  ',
    );
    await user.type(screen.getByLabelText('Preço de catálogo'), '149,9');
    await user.type(screen.getByLabelText('Preço de compra'), '089');
    await user.type(screen.getByLabelText('Preço original'), '179,90');
    await user.click(screen.getByRole('button', { name: 'Cadastrar produto' }));

    expect(
      screen.getByRole('button', { name: 'Cadastrando produto' }),
    ).toBeDisabled();
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/v1/products',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId,
          categoryId,
          code: 'PERF-001',
          description: 'Essencial feminino',
          catalogPrice: '149.90',
          purchasePrice: '89.00',
          originalPrice: '179.90',
        }),
      }),
    );

    await act(async () => {
      resolveRequest?.(
        new Response(
          JSON.stringify({
            data: {
              id: 'product-id',
              code: 'PERF-001',
              description: 'Essencial feminino',
            },
          }),
          { status: 201, headers: { 'Content-Type': 'application/json' } },
        ),
      );
    });

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Produto PERF-001 cadastrado.',
    );
    expect(screen.getByLabelText('Marca')).toHaveValue(brandId);
    expect(screen.getByLabelText('Categoria')).toHaveValue(categoryId);
    expect(screen.getByLabelText('Código do produto')).toHaveValue('');
    expect(screen.getByLabelText('Preço de catálogo')).toHaveValue('');
  });

  it('shows a duplicate conflict and preserves the product data', async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: 'PRODUCT_ALREADY_EXISTS',
            message:
              'Já existe um produto com este código para a marca informada.',
          },
        }),
        { status: 409, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    render(<CreateProductForm {...references} />);

    await user.selectOptions(screen.getByLabelText('Marca'), brandId);
    await user.selectOptions(screen.getByLabelText('Categoria'), categoryId);
    await user.type(screen.getByLabelText('Código do produto'), 'PERF-001');
    await user.type(screen.getByLabelText('Descrição'), 'Essencial feminino');
    await user.type(screen.getByLabelText('Preço de catálogo'), '149,90');
    await user.type(screen.getByLabelText('Preço de compra'), '89,00');
    await user.type(screen.getByLabelText('Preço original'), '179,90');
    await user.click(screen.getByRole('button', { name: 'Cadastrar produto' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Já existe um produto com este código para a marca informada.',
    );
    expect(screen.getByLabelText('Código do produto')).toHaveValue('PERF-001');
  });

  it('disables submission when active catalog references are unavailable', () => {
    render(<CreateProductForm brands={[]} categories={[]} />);

    expect(
      screen.getByRole('button', { name: 'Cadastrar produto' }),
    ).toBeDisabled();
    expect(screen.getByText('Nenhuma marca ativa disponível.')).toBeVisible();
    expect(screen.getByText('Nenhuma categoria ativa disponível.')).toBeVisible();
  });
});
