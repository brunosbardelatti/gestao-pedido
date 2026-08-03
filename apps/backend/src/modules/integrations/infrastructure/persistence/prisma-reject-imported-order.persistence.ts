import { Inject, Injectable } from '@nestjs/common';
import { ImportedOrderStatus } from '@prisma/client';

import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import { ImportedOrderNotDraftError } from '../../domain/errors/imported-order-not-draft.error';
import { ImportedOrderNotFoundError } from '../../domain/errors/imported-order-not-found.error';
import type {
  RejectImportedOrderPersistence,
  RejectImportedOrderPersistenceInput,
} from '../../application/ports/reject-imported-order-persistence';

@Injectable()
export class PrismaRejectImportedOrderPersistence
  implements RejectImportedOrderPersistence
{
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async reject(input: RejectImportedOrderPersistenceInput): Promise<void> {
    const existing = await this.prisma.importedOrder.findUnique({
      where: { id: input.importedOrderId },
      select: { id: true, status: true },
    });

    if (!existing) {
      throw new ImportedOrderNotFoundError();
    }

    if (existing.status !== ImportedOrderStatus.DRAFT) {
      throw new ImportedOrderNotDraftError();
    }

    const now = new Date();

    await this.prisma.$transaction([
      this.prisma.importedOrder.update({
        where: { id: input.importedOrderId },
        data: {
          status: ImportedOrderStatus.REJECTED,
          rejectionReason: input.reason,
          reviewedById: input.userId,
          reviewedAt: now,
        },
      }),
      this.prisma.auditLog.create({
        data: {
          actorType: 'USER',
          userId: input.userId,
          action: 'IMPORTED_ORDER_REJECTED',
          entityType: 'ImportedOrder',
          entityId: input.importedOrderId,
          requestId: input.requestId,
        },
      }),
    ]);
  }
}
