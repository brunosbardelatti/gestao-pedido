import { describe, expect, it, vi } from 'vitest';

import type { SaleReceiptGenerator } from '../../../src/modules/sales/application/ports/sale-receipt-generator';
import type { SaleReceiptPersistence } from '../../../src/modules/sales/application/ports/sale-receipt-persistence';
import { DownloadSaleReceiptUseCase } from '../../../src/modules/sales/application/use-cases/download-sale-receipt.use-case';
import { SaleNotFoundError } from '../../../src/modules/sales/domain/errors/sale-not-found.error';

const actorId = '55c1e5bb-4795-485b-af90-a8d25d3d94b1';
const saleId = 'abfb53af-ec77-4551-9ab2-2e6caf4f24fb';
const sale = {
  id: saleId,
  customer: null,
  status: 'COMPLETED' as const,
  saleDate: '2026-08-02T10:00:00.000Z',
  paymentMethod: 'PIX' as const,
  total: '24.00',
  notes: null,
  canceledAt: null,
  cancelReason: null,
  items: [],
  createdAt: '2026-08-02T10:00:00.000Z',
  updatedAt: '2026-08-02T10:00:00.000Z',
};

function makeSubject(persistedSale: typeof sale | null = sale) {
  const persistence: SaleReceiptPersistence = {
    findForReceiptWithAudit: vi.fn().mockResolvedValue(persistedSale),
  };
  const generator: SaleReceiptGenerator = {
    generate: vi.fn().mockResolvedValue(Buffer.from('%PDF-test')),
  };
  return {
    persistence,
    generator,
    useCase: new DownloadSaleReceiptUseCase(persistence, generator),
  };
}

describe('DownloadSaleReceiptUseCase', () => {
  it('loads the sale with audit and generates its PDF', async () => {
    const subject = makeSubject();
    const result = await subject.useCase.execute({
      actorId,
      saleId,
      requestId: 'req-receipt',
    });

    expect(subject.persistence.findForReceiptWithAudit).toHaveBeenCalledWith({
      actorId,
      saleId,
      requestId: 'req-receipt',
    });
    expect(subject.generator.generate).toHaveBeenCalledWith(sale);
    expect(result).toEqual({
      content: Buffer.from('%PDF-test'),
      filename: `recibo-venda-${saleId}.pdf`,
    });
  });

  it('rejects an unknown sale without generating a document', async () => {
    const subject = makeSubject(null);
    await expect(
      subject.useCase.execute({ actorId, saleId }),
    ).rejects.toBeInstanceOf(SaleNotFoundError);
    expect(subject.generator.generate).not.toHaveBeenCalled();
  });
});
