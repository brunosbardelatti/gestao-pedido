import { InvalidNfeXmlError } from '../../domain/errors/invalid-nfe-xml.error';
import type {
  ImportNfePersistence,
  ImportedOrderSummary,
  ParsedNfeData,
  ParsedNfeItem,
} from '../ports/import-nfe-persistence';

export interface ImportNfeInput {
  xml: string;
  idempotencyKey: string;
  userId: string;
  requestId: string;
}

export class ImportNfeUseCase {
  constructor(private readonly persistence: ImportNfePersistence) {}

  async execute(input: ImportNfeInput): Promise<ImportedOrderSummary> {
    const trimmedXml = input.xml.trim();
    if (!trimmedXml) {
      throw new InvalidNfeXmlError('conteúdo vazio.');
    }

    const parsed = this.parseNfeXml(trimmedXml);

    return this.persistence.importDraft({
      idempotencyKey: input.idempotencyKey,
      rawXml: trimmedXml,
      parsedData: parsed,
      importedById: input.userId,
      requestId: input.requestId,
    });
  }

  private parseNfeXml(xml: string): ParsedNfeData {
    if (!xml.includes('<nfeProc') && !xml.includes('<NFe')) {
      throw new InvalidNfeXmlError('não contém elemento raiz de NF-e.');
    }

    const accessKey = this.extractTag(xml, 'chNFe');
    const supplierName =
      this.extractTag(xml, 'xNome') ?? this.extractTag(xml, 'xFant');
    const items = this.extractItems(xml);

    if (items.length === 0) {
      throw new InvalidNfeXmlError('nenhum item de produto encontrado.');
    }

    return { accessKey, supplierName, items };
  }

  private extractTag(xml: string, tag: string): string | null {
    const regex = new RegExp(`<${tag}[^>]*>([^<]+)</${tag}>`);
    const match = xml.match(regex);
    return match?.[1]?.trim() ?? null;
  }

  private extractItems(xml: string): ParsedNfeItem[] {
    const items: ParsedNfeItem[] = [];
    const detRegex = /<det\b[^>]*>([\s\S]*?)<\/det>/g;
    let match: RegExpExecArray | null;

    while ((match = detRegex.exec(xml)) !== null) {
      const block = match[1];
      const code = this.extractTag(block, 'cProd');
      const description = this.extractTag(block, 'xProd');
      const quantity = this.extractTag(block, 'qCom');
      const unitPrice = this.extractTag(block, 'vUnCom');

      if (code && description && quantity && unitPrice) {
        items.push({
          productCode: code,
          description,
          quantity: Math.round(Number(quantity)),
          unitPrice: Number(unitPrice).toFixed(2),
        });
      }
    }

    return items;
  }
}
