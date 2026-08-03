import { describe, expect, it, vi } from 'vitest';

import type { ImportNfePersistence } from '../../../src/modules/integrations/application/ports/import-nfe-persistence';
import { ImportNfeUseCase } from '../../../src/modules/integrations/application/use-cases/import-nfe.use-case';
import { InvalidNfeXmlError } from '../../../src/modules/integrations/domain/errors/invalid-nfe-xml.error';

const VALID_XML = `<?xml version="1.0"?>
<nfeProc>
  <NFe>
    <infNFe>
      <ide><cNF>12345678</cNF></ide>
      <emit><xNome>Natura Cosméticos</xNome></emit>
      <det nItem="1">
        <prod>
          <cProd>NAT-001</cProd>
          <xProd>Perfume essencial</xProd>
          <qCom>5</qCom>
          <vUnCom>12.50</vUnCom>
        </prod>
      </det>
      <det nItem="2">
        <prod>
          <cProd>NAT-002</cProd>
          <xProd>Creme corporal</xProd>
          <qCom>3</qCom>
          <vUnCom>8.00</vUnCom>
        </prod>
      </det>
      <protNFe><infProt><chNFe>35260812345678901234550010000012341000012349</chNFe></infProt></protNFe>
    </infNFe>
  </NFe>
</nfeProc>`;

describe('ImportNfeUseCase', () => {
  it('parses a valid NF-e XML and delegates to persistence', async () => {
    const persistence: ImportNfePersistence = {
      importDraft: vi.fn().mockResolvedValue({
        id: 'imported-id',
        idempotencyKey: 'key-1',
        nfeAccessKey: '35260812345678901234550010000012341000012349',
        supplierName: 'Natura Cosméticos',
        status: 'DRAFT',
        items: [
          {
            productCode: 'NAT-001',
            description: 'Perfume essencial',
            quantity: 5,
            unitPrice: '12.50',
          },
          {
            productCode: 'NAT-002',
            description: 'Creme corporal',
            quantity: 3,
            unitPrice: '8.00',
          },
        ],
        createdAt: '2026-08-02T00:00:00.000Z',
      }),
    };

    const useCase = new ImportNfeUseCase(persistence);
    const result = await useCase.execute({
      xml: VALID_XML,
      idempotencyKey: 'key-1',
      userId: 'user-id',
      requestId: 'req-id',
    });

    expect(result.status).toBe('DRAFT');
    expect(result.items).toHaveLength(2);
    expect(persistence.importDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotencyKey: 'key-1',
        parsedData: expect.objectContaining({
          accessKey: '35260812345678901234550010000012341000012349',
          supplierName: 'Natura Cosméticos',
          items: expect.arrayContaining([
            expect.objectContaining({ productCode: 'NAT-001', quantity: 5 }),
          ]),
        }),
      }),
    );
  });

  it('rejects empty XML content', async () => {
    const persistence: ImportNfePersistence = { importDraft: vi.fn() };
    const useCase = new ImportNfeUseCase(persistence);

    await expect(
      useCase.execute({
        xml: '   ',
        idempotencyKey: 'key-1',
        userId: 'user-id',
        requestId: 'req-id',
      }),
    ).rejects.toBeInstanceOf(InvalidNfeXmlError);
  });

  it('rejects XML without NF-e root element', async () => {
    const persistence: ImportNfePersistence = { importDraft: vi.fn() };
    const useCase = new ImportNfeUseCase(persistence);

    await expect(
      useCase.execute({
        xml: '<html><body>Not an NF-e</body></html>',
        idempotencyKey: 'key-1',
        userId: 'user-id',
        requestId: 'req-id',
      }),
    ).rejects.toBeInstanceOf(InvalidNfeXmlError);
  });

  it('rejects NF-e XML without product items', async () => {
    const persistence: ImportNfePersistence = { importDraft: vi.fn() };
    const useCase = new ImportNfeUseCase(persistence);

    await expect(
      useCase.execute({
        xml: '<nfeProc><NFe><infNFe></infNFe></NFe></nfeProc>',
        idempotencyKey: 'key-1',
        userId: 'user-id',
        requestId: 'req-id',
      }),
    ).rejects.toBeInstanceOf(InvalidNfeXmlError);
  });
});
