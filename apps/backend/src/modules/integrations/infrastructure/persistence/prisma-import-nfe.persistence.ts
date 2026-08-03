import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import { ImportIdempotencyConflictError } from '../../domain/errors/import-idempotency-conflict.error';
import type {
  ImportNfePersistence,
  ImportNfePersistenceInput,
  ImportedOrderSummary,
} from '../../application/ports/import-nfe-persistence';

@Injectable()
export class PrismaImportNfePersistence implements ImportNfePersistence {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async importDraft(
    input: ImportNfePersistenceInput,
  ): Promise<ImportedOrderSummary> {
    try {
      const [imported] = await this.prisma.$transaction([
        this.prisma.importedOrder.create({
          data: {
            idempotencyKey: input.idempotencyKey,
            nfeAccessKey: input.parsedData.accessKey,
            supplierName: input.parsedData.supplierName,
            rawXml: input.rawXml,
            parsedData: input.parsedData as unknown as Prisma.JsonObject,
            importedById: input.importedById,
            items: {
              create: input.parsedData.items.map((item) => ({
                productCode: item.productCode,
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
              })),
            },
          },
          include: { items: true },
        }),
        this.prisma.auditLog.create({
          data: {
            actorType: 'USER',
            userId: input.importedById,
            action: 'NFE_IMPORTED',
            entityType: 'ImportedOrder',
            requestId: input.requestId,
          },
        }),
      ]);

      return {
        id: imported.id,
        idempotencyKey: imported.idempotencyKey,
        nfeAccessKey: imported.nfeAccessKey,
        supplierName: imported.supplierName,
        status: imported.status,
        items: imported.items.map((item) => ({
          productCode: item.productCode,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice.toString(),
        })),
        createdAt: imported.createdAt.toISOString(),
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ImportIdempotencyConflictError();
      }
      throw error;
    }
  }
}
