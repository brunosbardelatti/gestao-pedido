import { Inject, Injectable } from '@nestjs/common';
import { ImportedOrderStatus, OrderStatus } from '@prisma/client';

import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import { ImportedOrderNotDraftError } from '../../domain/errors/imported-order-not-draft.error';
import { ImportedOrderNotFoundError } from '../../domain/errors/imported-order-not-found.error';
import type {
  ApproveImportedOrderPersistence,
  ApproveImportedOrderPersistenceInput,
  ApproveImportedOrderResult,
} from '../../application/ports/approve-imported-order-persistence';

@Injectable()
export class PrismaApproveImportedOrderPersistence
  implements ApproveImportedOrderPersistence
{
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async approve(
    input: ApproveImportedOrderPersistenceInput,
  ): Promise<ApproveImportedOrderResult> {
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

    const [, order] = await this.prisma.$transaction([
      this.prisma.importedOrder.update({
        where: { id: input.importedOrderId },
        data: {
          status: ImportedOrderStatus.APPROVED,
          reviewedById: input.userId,
          reviewedAt: now,
        },
      }),
      this.prisma.order.create({
        data: {
          brandId: input.brandId,
          cycle: input.cycle,
          orderDate: new Date(`${input.orderDate}T00:00:00.000Z`),
          status: OrderStatus.OPEN,
          notes: input.notes,
          createdById: input.userId,
          updatedById: input.userId,
          importedOrders: {
            connect: { id: input.importedOrderId },
          },
          items: {
            create: input.items.map((item) => ({
              productId: item.productId,
              quantityOrdered: item.quantityOrdered,
              catalogUnitPrice: item.catalogUnitPrice,
              purchaseUnitPrice: item.purchaseUnitPrice,
              originalUnitPrice: item.originalUnitPrice,
              expirationDate: item.expirationDate
                ? new Date(`${item.expirationDate}T00:00:00.000Z`)
                : null,
            })),
          },
        },
      }),
      this.prisma.auditLog.create({
        data: {
          actorType: 'USER',
          userId: input.userId,
          action: 'IMPORTED_ORDER_APPROVED',
          entityType: 'ImportedOrder',
          entityId: input.importedOrderId,
          requestId: input.requestId,
        },
      }),
    ]);

    return {
      importedOrderId: input.importedOrderId,
      orderId: order.id,
      status: 'APPROVED',
    };
  }
}
