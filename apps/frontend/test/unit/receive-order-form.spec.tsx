import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ReceiveOrderForm } from '@/components/orders/receive-order-form';

const orderId = 'abfb53af-ec77-4551-9ab2-2e6caf4f24fb';
const firstItemId = '47c9f5c4-24a5-463c-ab91-3fc6e0b83fe8';
const secondItemId = '28828ed0-e78d-41ad-a648-727ebee00da1';
const order = {
  id: orderId,
  brand: {
    id: '26bf7359-befe-4eb9-bcc9-58fc72489be0',
    name: 'Natura',
    active: true,
    createdAt: '2026-08-02T10:00:00.000Z',
    updatedAt: '2026-08-02T10:00:00.000Z',
  },
  cycle: '12/2026',
  orderDate: '2026-08-02',
  receivedAt: null,
  canceledAt: null,
  cancelReason: null,
  status: 'OPEN' as const,
  notes: null,
  items: [
    {
      id: firstItemId,
      productId: '6a9028c4-b4dc-4132-b897-cd9e8049a33f',
      productCode: 'PERF-001',
      productDescription: 'Essencial feminino',
      quantityOrdered: 3,
      quantityReceived: 0,
      catalogUnitPrice: '149.90',
      purchaseUnitPrice: '89.00',
      originalUnitPrice: '179.90',
      expirationDate: null,
      notes: 'Brinde incluído',
    },
    {
      id: secondItemId,
      productId: 'dba99dc7-61ed-489f-a016-a4a614850871',
      productCode: 'CREME-001',
      productDescription: 'Creme corporal',
      quantityOrdered: 2,
      quantityReceived: 0,
      catalogUnitPrice: '99.90',
      purchaseUnitPrice: '59.00',
      originalUnitPrice: '119.90',
      expirationDate: null,
      notes: null,
    },
  ],
  createdAt: '2026-08-02T10:00:00.000Z',
  updatedAt: '2026-08-02T10:00:00.000Z',
};

describe('ReceiveOrderForm', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('renders every order item with the ordered quantity as default', () => {
    render(<ReceiveOrderForm order={order} />);

    expect(screen.getByText('PERF-001')).toBeVisible();
    expect(screen.getByText('Essencial feminino')).toBeVisible();
    expect(screen.getByLabelText('Quantidade recebida de PERF-001')).toHaveValue(
      3,
    );
    expect(screen.getByLabelText('Quantidade recebida de CREME-001')).toHaveValue(
      2,
    );
    expect(screen.getByLabelText('Observações de PERF-001')).toHaveValue(
      'Brinde incluído',
    );
  });

  it('rejects a quantity above the ordered amount before contacting the API', async () => {
    const user = userEvent.setup();
    render(<ReceiveOrderForm order={order} />);

    await user.clear(screen.getByLabelText('Quantidade recebida de PERF-001'));
    await user.type(
      screen.getByLabelText('Quantidade recebida de PERF-001'),
      '4',
    );
    await user.click(
      screen.getByRole('button', { name: 'Confirmar recebimento' }),
    );

    expect(
      await screen.findByText('A quantidade máxima para este item é 3.'),
    ).toBeVisible();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('receives the order with normalized optional values and idempotency', async () => {
    const user = userEvent.setup();
    let resolveRequest: ((response: Response) => void) | undefined;
    vi.mocked(fetch).mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveRequest = resolve;
      }),
    );
    render(<ReceiveOrderForm order={order} />);

    await user.type(
      screen.getByLabelText('Validade de PERF-001'),
      '2027-12-31',
    );
    await user.clear(screen.getByLabelText('Quantidade recebida de CREME-001'));
    await user.type(
      screen.getByLabelText('Quantidade recebida de CREME-001'),
      '0',
    );
    await user.click(
      screen.getByRole('button', { name: 'Confirmar recebimento' }),
    );

    expect(
      screen.getByRole('button', { name: 'Confirmando recebimento' }),
    ).toBeDisabled();
    expect(fetch).toHaveBeenCalledWith(
      `http://localhost:3001/api/v1/orders/${orderId}/receive`,
      {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': expect.stringMatching(
            /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
          ),
        },
        body: JSON.stringify({
          items: [
            {
              orderItemId: firstItemId,
              quantityReceived: 3,
              expirationDate: '2027-12-31',
              notes: 'Brinde incluído',
            },
            {
              orderItemId: secondItemId,
              quantityReceived: 0,
            },
          ],
        }),
      },
    );

    await act(async () => {
      resolveRequest?.(
        new Response(
          JSON.stringify({ data: { id: orderId, cycle: '12/2026' } }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );
    });

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Pedido do ciclo 12/2026 recebido.',
    );
  });

  it('reuses the idempotency key when the same receipt is retried', async () => {
    const user = userEvent.setup();
    vi.mocked(fetch)
      .mockRejectedValueOnce(new Error('connection lost'))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ data: { id: orderId, cycle: '12/2026' } }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );
    render(<ReceiveOrderForm order={order} />);

    await user.click(
      screen.getByRole('button', { name: 'Confirmar recebimento' }),
    );
    expect(await screen.findByRole('alert')).toBeVisible();
    await user.click(
      screen.getByRole('button', { name: 'Confirmar recebimento' }),
    );

    await act(async () => undefined);
    const firstHeaders = vi.mocked(fetch).mock.calls[0]?.[1]?.headers as Record<
      string,
      string
    >;
    const secondHeaders = vi.mocked(fetch).mock.calls[1]?.[1]?.headers as Record<
      string,
      string
    >;
    expect(secondHeaders['Idempotency-Key']).toBe(
      firstHeaders['Idempotency-Key'],
    );
  });
});
