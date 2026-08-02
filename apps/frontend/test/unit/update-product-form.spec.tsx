import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UpdateProductForm } from '@/components/products/update-product-form';

const refresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}));

const productId = '6a9028c4-b4dc-4132-b897-cd9e8049a33f';
const brandId = '26bf7359-befe-4eb9-bcc9-58fc72489be0';
const categoryId = 'bfab0010-f11e-4e5f-ad4b-a531c32b6472';
const props = {
  productId,
  brands: [{ id: brandId, name: 'Natura' }],
  categories: [{ id: categoryId, name: 'Perfumaria' }],
  initialValues: {
    brandId,
    categoryId,
    code: 'PERF-001',
    description: 'Essencial feminino',
    catalogPrice: '149.90',
    purchasePrice: '89.00',
    originalPrice: '179.90',
    suggestedSalePrice: '169.90',
  },
};

describe('UpdateProductForm', () => {
  beforeEach(() => {
    refresh.mockReset();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('renders the current product values', () => {
    render(<UpdateProductForm {...props} />);

    expect(screen.getByLabelText('Marca')).toHaveValue(brandId);
    expect(screen.getByLabelText('Categoria')).toHaveValue(categoryId);
    expect(screen.getByLabelText('Código do produto')).toHaveValue('PERF-001');
    expect(screen.getByLabelText('Descrição')).toHaveValue(
      'Essencial feminino',
    );
    expect(screen.getByLabelText('Preço sugerido de venda (opcional)')).toHaveValue(
      '169.90',
    );
  });

  it('updates normalized values and explicitly clears the suggested price', async () => {
    const user = userEvent.setup();
    let resolveRequest: ((response: Response) => void) | undefined;
    vi.mocked(fetch).mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveRequest = resolve;
      }),
    );
    render(<UpdateProductForm {...props} />);

    await user.clear(screen.getByLabelText('Código do produto'));
    await user.type(screen.getByLabelText('Código do produto'), ' PERF-002 ');
    await user.clear(screen.getByLabelText('Preço de catálogo'));
    await user.type(screen.getByLabelText('Preço de catálogo'), '159,9');
    await user.clear(
      screen.getByLabelText('Preço sugerido de venda (opcional)'),
    );
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(
      screen.getByRole('button', { name: 'Salvando alterações' }),
    ).toBeDisabled();
    expect(fetch).toHaveBeenCalledWith(
      `http://localhost:3001/api/v1/products/${productId}`,
      expect.objectContaining({
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId,
          categoryId,
          code: 'PERF-002',
          description: 'Essencial feminino',
          catalogPrice: '159.90',
          purchasePrice: '89.00',
          originalPrice: '179.90',
          suggestedSalePrice: null,
        }),
      }),
    );

    await act(async () => {
      resolveRequest?.(
        new Response(
          JSON.stringify({ data: { code: 'PERF-002' } }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );
    });

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Produto PERF-002 atualizado.',
    );
    expect(refresh).toHaveBeenCalledOnce();
  });

  it('shows a uniqueness conflict without clearing the form', async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            message:
              'Já existe um produto com este código para a marca informada.',
          },
        }),
        { status: 409, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    render(<UpdateProductForm {...props} />);

    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Já existe um produto com este código para a marca informada.',
    );
    expect(screen.getByLabelText('Código do produto')).toHaveValue('PERF-001');
  });
});
