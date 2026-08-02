import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UpdateOrderForm } from '@/components/orders/update-order-form';

const refresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}));

const orderId = 'abfb53af-ec77-4551-9ab2-2e6caf4f24fb';
const brandId = '26bf7359-befe-4eb9-bcc9-58fc72489be0';
const firstProductId = '6a9028c4-b4dc-4132-b897-cd9e8049a33f';
const secondProductId = 'dba99dc7-61ed-489f-a016-a4a614850871';

const props = {
  orderId,
  brands: [{ id: brandId, name: 'Natura' }],
  products: [
    {
      id: firstProductId,
      brandId,
      code: 'PERF-001',
      description: 'Essencial feminino',
      catalogPrice: '149.90',
      purchasePrice: '89.00',
      originalPrice: '179.90',
    },
    {
      id: secondProductId,
      brandId,
      code: 'CREME-001',
      description: 'Creme corporal',
      catalogPrice: '99.90',
      purchasePrice: '59.00',
      originalPrice: '119.90',
    },
  ],
  initialValues: {
    brandId,
    cycle: '12/2026',
    orderDate: '2026-08-02',
    notes: 'Campanha de agosto',
    items: [
      {
        productId: firstProductId,
        quantityOrdered: 2,
        catalogUnitPrice: '149.90',
        purchaseUnitPrice: '89.00',
        originalUnitPrice: '179.90',
        notes: 'Brinde incluído',
      },
    ],
  },
};

describe('UpdateOrderForm', () => {
  beforeEach(() => {
    refresh.mockReset();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('renders the complete current order aggregate', () => {
    render(<UpdateOrderForm {...props} />);

    expect(screen.getByLabelText('Marca')).toHaveValue(brandId);
    expect(screen.getByLabelText('Ciclo')).toHaveValue('12/2026');
    expect(screen.getByLabelText('Data do pedido')).toHaveValue('2026-08-02');
    expect(screen.getByLabelText('Observações do pedido')).toHaveValue(
      'Campanha de agosto',
    );
    expect(screen.getByLabelText('Produto do item 1')).toHaveValue(
      firstProductId,
    );
    expect(screen.getByLabelText('Quantidade do item 1')).toHaveValue(2);
    expect(screen.getByLabelText('Observações do item')).toHaveValue(
      'Brinde incluído',
    );
  });

  it('updates normalized values without sending an idempotency key', async () => {
    const user = userEvent.setup();
    let resolveRequest: ((response: Response) => void) | undefined;
    vi.mocked(fetch).mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveRequest = resolve;
      }),
    );
    render(<UpdateOrderForm {...props} />);

    await user.clear(screen.getByLabelText('Ciclo'));
    await user.type(screen.getByLabelText('Ciclo'), ' 13/2026 ');
    await user.clear(screen.getByLabelText('Preço de compra do item 1'));
    await user.type(screen.getByLabelText('Preço de compra do item 1'), '099,9');
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(
      screen.getByRole('button', { name: 'Salvando alterações' }),
    ).toBeDisabled();
    expect(fetch).toHaveBeenCalledWith(
      `http://localhost:3001/api/v1/orders/${orderId}`,
      {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId,
          cycle: '13/2026',
          orderDate: '2026-08-02',
          notes: 'Campanha de agosto',
          items: [
            {
              productId: firstProductId,
              quantityOrdered: 2,
              catalogUnitPrice: '149.90',
              purchaseUnitPrice: '99.90',
              originalUnitPrice: '179.90',
              notes: 'Brinde incluído',
            },
          ],
        }),
      },
    );

    await act(async () => {
      resolveRequest?.(
        new Response(
          JSON.stringify({ data: { id: orderId, cycle: '13/2026' } }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );
    });

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Pedido do ciclo 13/2026 atualizado.',
    );
    expect(refresh).toHaveBeenCalledOnce();
  });

  it('shows a business error without clearing the order', async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          error: { message: 'Somente pedidos em aberto podem ser editados.' },
        }),
        { status: 422, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    render(<UpdateOrderForm {...props} />);

    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Somente pedidos em aberto podem ser editados.',
    );
    expect(screen.getByLabelText('Ciclo')).toHaveValue('12/2026');
  });
});
