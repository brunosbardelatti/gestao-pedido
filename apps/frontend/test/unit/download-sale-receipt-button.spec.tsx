import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DownloadSaleReceiptButton } from '@/components/sales/download-sale-receipt-button';

const saleId = 'abfb53af-ec77-4551-9ab2-2e6caf4f24fb';

describe('DownloadSaleReceiptButton', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:receipt'),
      revokeObjectURL: vi.fn(),
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
  });

  it('downloads the authenticated PDF with a stable filename', async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue(
      new Response(new Blob(['%PDF-test'], { type: 'application/pdf' }), {
        status: 200,
        headers: { 'Content-Type': 'application/pdf' },
      }),
    );
    render(<DownloadSaleReceiptButton saleId={saleId} />);

    await user.click(screen.getByRole('button', { name: 'Baixar recibo' }));

    expect(fetch).toHaveBeenCalledWith(
      `http://localhost:3001/api/v1/sales/${saleId}/receipt`,
      { credentials: 'include' },
    );
    const downloadedBlob = vi.mocked(URL.createObjectURL).mock.calls[0]?.[0];
    expect(downloadedBlob).toMatchObject({ type: 'application/pdf' });
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledOnce();
    expect(await screen.findByRole('status')).toHaveTextContent('Recibo baixado.');
  });

  it('shows the API error without navigating away', async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ error: { message: 'Venda não encontrada.' } }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    render(<DownloadSaleReceiptButton saleId={saleId} />);
    await user.click(screen.getByRole('button', { name: 'Baixar recibo' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Venda não encontrada.',
    );
  });
});
