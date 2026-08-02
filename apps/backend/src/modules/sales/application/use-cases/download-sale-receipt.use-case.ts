import { SaleNotFoundError } from '../../domain/errors/sale-not-found.error';
import type { SaleReceiptGenerator } from '../ports/sale-receipt-generator';
import type { SaleReceiptPersistence } from '../ports/sale-receipt-persistence';

export interface DownloadSaleReceiptInput {
  actorId: string;
  saleId: string;
  requestId?: string;
}

export interface SaleReceiptDownload {
  content: Buffer;
  filename: string;
}

export class DownloadSaleReceiptUseCase {
  constructor(
    private readonly persistence: SaleReceiptPersistence,
    private readonly generator: SaleReceiptGenerator,
  ) {}

  async execute(input: DownloadSaleReceiptInput): Promise<SaleReceiptDownload> {
    const sale = await this.persistence.findForReceiptWithAudit(input);
    if (!sale) throw new SaleNotFoundError();

    return {
      content: await this.generator.generate(sale),
      filename: `recibo-venda-${sale.id}.pdf`,
    };
  }
}
