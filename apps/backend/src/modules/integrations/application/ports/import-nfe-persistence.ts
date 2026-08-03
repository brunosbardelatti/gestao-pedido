export interface ParsedNfeItem {
  productCode: string;
  description: string;
  quantity: number;
  unitPrice: string;
}

export interface ParsedNfeData {
  accessKey: string | null;
  supplierName: string | null;
  items: ParsedNfeItem[];
}

export interface ImportNfePersistenceInput {
  idempotencyKey: string;
  rawXml: string;
  parsedData: ParsedNfeData;
  importedById: string;
  requestId: string;
}

export interface ImportedOrderSummary {
  id: string;
  idempotencyKey: string;
  nfeAccessKey: string | null;
  supplierName: string | null;
  status: string;
  items: ParsedNfeItem[];
  createdAt: string;
}

export interface ImportNfePersistence {
  importDraft(
    input: ImportNfePersistenceInput,
  ): Promise<ImportedOrderSummary>;
}
