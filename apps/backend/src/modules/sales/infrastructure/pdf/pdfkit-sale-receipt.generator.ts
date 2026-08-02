import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';

import type { PersistedSale } from '../../application/ports/create-sale-persistence';
import type { SaleReceiptGenerator } from '../../application/ports/sale-receipt-generator';

const page = { width: 595.28, height: 841.89, margin: 48 };
const colors = {
  ink: '#202622',
  muted: '#67716b',
  line: '#d7ded9',
  accent: '#356b57',
  surface: '#eef3f0',
};

const payments: Record<string, string> = {
  CASH: 'Dinheiro',
  PIX: 'Pix',
  DEBIT_CARD: 'Cartão de débito',
  CREDIT_CARD: 'Cartão de crédito',
  BANK_TRANSFER: 'Transferência bancária',
  OTHER: 'Outra',
};

function currency(value: string): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value));
}

function saleDate(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(value));
}

function cpf(value: string): string {
  return value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

@Injectable()
export class PdfkitSaleReceiptGenerator implements SaleReceiptGenerator {
  private readonly resellerName =
    process.env.RESELLER_NAME?.trim() || 'Gestão de Pedidos';
  private readonly resellerDetails =
    process.env.RESELLER_DETAILS?.trim() || 'Revendedora de cosméticos';

  async generate(sale: PersistedSale): Promise<Buffer> {
    const document = new PDFDocument({
      size: 'A4',
      margin: page.margin,
      bufferPages: true,
      info: {
        Title: `Recibo da venda ${sale.id}`,
        Author: this.resellerName,
        Subject: 'Recibo não fiscal',
      },
    });
    const chunks: Buffer[] = [];
    document.on('data', (chunk: Buffer) => chunks.push(chunk));
    const completed = new Promise<Buffer>((resolve, reject) => {
      document.on('end', () => resolve(Buffer.concat(chunks)));
      document.on('error', reject);
    });

    this.drawHeader(document, sale);
    this.drawCustomer(document, sale);
    this.drawItems(document, sale);
    this.drawSummary(document, sale);
    this.drawFooters(document);
    document.end();
    return completed;
  }

  private drawHeader(document: PDFKit.PDFDocument, sale: PersistedSale): void {
    document
      .fillColor(colors.accent)
      .font('Helvetica-Bold')
      .fontSize(18)
      .text(this.resellerName);
    document
      .fillColor(colors.muted)
      .font('Helvetica')
      .fontSize(9)
      .text(this.resellerDetails, { width: 310 });
    document
      .fillColor(colors.ink)
      .font('Helvetica-Bold')
      .fontSize(10)
      .text('RECIBO DE VENDA', 390, page.margin, {
        width: 157,
        align: 'right',
      });
    document
      .font('Helvetica')
      .fontSize(8)
      .fillColor(colors.muted)
      .text(`Venda ${sale.id}`, 290, 68, { width: 257, align: 'right' });
    document
      .moveTo(page.margin, 96)
      .lineTo(page.width - page.margin, 96)
      .strokeColor(colors.line)
      .stroke();
    document
      .fillColor(colors.ink)
      .font('Helvetica-Bold')
      .fontSize(20)
      .text(currency(sale.total), page.margin, 116);
    document
      .font('Helvetica')
      .fontSize(9)
      .fillColor(colors.muted)
      .text(saleDate(sale.saleDate), page.margin, 144)
      .text(
        sale.status === 'CANCELED' ? 'Venda cancelada' : 'Venda concluída',
        390,
        122,
        { width: 157, align: 'right' },
      );
    document.x = page.margin;
    document.y = 184;
  }

  private drawCustomer(document: PDFKit.PDFDocument, sale: PersistedSale): void {
    this.sectionTitle(document, 'CLIENTE');
    if (!sale.customer) {
      document
        .font('Helvetica')
        .fontSize(9)
        .fillColor(colors.muted)
        .text('Cliente não informado.');
      document.moveDown(1.4);
      return;
    }

    const details = [
      sale.customer.cpf ? `CPF ${cpf(sale.customer.cpf)}` : null,
      sale.customer.phone ? `Telefone ${sale.customer.phone}` : null,
      sale.customer.addressLine,
      [sale.customer.city, sale.customer.state].filter(Boolean).join(' - ') || null,
      sale.customer.postalCode ? `CEP ${sale.customer.postalCode}` : null,
    ].filter((value): value is string => Boolean(value));
    document
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor(colors.ink)
      .text(sale.customer.name, page.margin, document.y, {
        width: page.width - page.margin * 2,
      });
    if (details.length > 0) {
      document
        .font('Helvetica')
        .fontSize(8.5)
        .fillColor(colors.muted)
        .text(details.join('  |  '), { width: page.width - page.margin * 2 });
    }
    document.moveDown(1.4);
  }

  private drawItems(document: PDFKit.PDFDocument, sale: PersistedSale): void {
    this.sectionTitle(document, 'ITENS');
    this.tableHeader(document);
    for (const item of sale.items) {
      const product = `${item.productCode} - ${item.productDescription}`;
      const rowHeight = Math.max(
        28,
        document.heightOfString(product, { width: 250 }) + 12,
      );
      if (document.y + rowHeight > page.height - 100) {
        document.addPage();
        document.y = page.margin;
        this.tableHeader(document);
      }
      const y = document.y;
      document
        .font('Helvetica')
        .fontSize(8.5)
        .fillColor(colors.ink)
        .text(product, page.margin + 6, y + 8, { width: 250 });
      document.text(String(item.quantity), 310, y + 8, { width: 45, align: 'right' });
      document.text(currency(item.unitPrice), 365, y + 8, {
        width: 82,
        align: 'right',
      });
      document.font('Helvetica-Bold').text(currency(item.subtotal), 457, y + 8, {
        width: 84,
        align: 'right',
      });
      document
        .moveTo(page.margin, y + rowHeight)
        .lineTo(page.width - page.margin, y + rowHeight)
        .strokeColor(colors.line)
        .stroke();
      document.y = y + rowHeight;
    }
    document.moveDown(1.2);
  }

  private tableHeader(document: PDFKit.PDFDocument): void {
    const y = document.y;
    document.rect(page.margin, y, page.width - page.margin * 2, 24).fill(colors.surface);
    document
      .font('Helvetica-Bold')
      .fontSize(7.5)
      .fillColor(colors.muted)
      .text('PRODUTO', page.margin + 6, y + 8, { width: 250 })
      .text('QTD.', 310, y + 8, { width: 45, align: 'right' })
      .text('UNITÁRIO', 365, y + 8, { width: 82, align: 'right' })
      .text('SUBTOTAL', 457, y + 8, { width: 84, align: 'right' });
    document.y = y + 24;
  }

  private drawSummary(document: PDFKit.PDFDocument, sale: PersistedSale): void {
    if (document.y > page.height - 190) {
      document.addPage();
      document.y = page.margin;
    }
    const y = document.y + 8;
    document
      .font('Helvetica')
      .fontSize(9)
      .fillColor(colors.muted)
      .text('TOTAL', 365, y, { width: 82, align: 'right' })
      .font('Helvetica-Bold')
      .fontSize(15)
      .fillColor(colors.ink)
      .text(currency(sale.total), 457, y - 4, { width: 84, align: 'right' });
    document.y = y + 36;
    document.x = page.margin;
    if (sale.paymentMethod) {
      document
        .font('Helvetica')
        .fontSize(9)
        .fillColor(colors.ink)
        .text(`Forma de pagamento: ${payments[sale.paymentMethod] ?? sale.paymentMethod}`);
    }
    if (sale.notes) {
      document
        .font('Helvetica')
        .fontSize(9)
        .fillColor(colors.ink)
        .text(`Observações: ${sale.notes}`, { width: 420 });
    }
    if (sale.status === 'CANCELED') {
      document
        .font('Helvetica')
        .fontSize(9)
        .fillColor(colors.ink)
        .text(`Cancelamento: ${sale.cancelReason ?? 'Motivo não informado'}`, {
          width: 420,
        });
    }
  }

  private sectionTitle(document: PDFKit.PDFDocument, title: string): void {
    const y = document.y;
    document
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor(colors.accent)
      .text(title, page.margin, y, { width: page.width - page.margin * 2 });
    document.x = page.margin;
    document.moveDown(0.5);
  }

  private drawFooters(document: PDFKit.PDFDocument): void {
    const range = document.bufferedPageRange();
    for (let index = 0; index < range.count; index += 1) {
      document.switchToPage(range.start + index);
      document
        .moveTo(page.margin, page.height - 74)
        .lineTo(page.width - page.margin, page.height - 74)
        .strokeColor(colors.line)
        .stroke();
      document
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor(colors.muted)
        .text('Documento não fiscal', page.margin, page.height - 64, {
          width: 200,
          lineBreak: false,
        })
        .text(`Página ${index + 1} de ${range.count}`, 397, page.height - 64, {
          width: 150,
          align: 'right',
          lineBreak: false,
        });
    }
  }
}
