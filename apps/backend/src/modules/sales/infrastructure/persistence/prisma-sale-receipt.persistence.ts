import { Inject, Injectable } from '@nestjs/common';
import { ActorType } from '@prisma/client';

import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import type {
  SaleReceiptPersistence,
  SaleReceiptPersistenceInput,
} from '../../application/ports/sale-receipt-persistence';
import { saleRelations, serializeSale } from './sale-persistence.mapper';

@Injectable()
export class PrismaSaleReceiptPersistence implements SaleReceiptPersistence {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findForReceiptWithAudit(input: SaleReceiptPersistenceInput) {
    return this.prisma.$transaction(async (transaction) => {
      const persisted = await transaction.sale.findUnique({
        where: { id: input.saleId },
        include: saleRelations,
      });
      if (!persisted) return null;

      await transaction.auditLog.create({
        data: {
          actorType: ActorType.USER,
          userId: input.actorId,
          action: 'SALE_RECEIPT_DOWNLOADED',
          entityType: 'Sale',
          entityId: input.saleId,
          requestId: input.requestId,
        },
      });
      return serializeSale(persisted);
    });
  }
}
