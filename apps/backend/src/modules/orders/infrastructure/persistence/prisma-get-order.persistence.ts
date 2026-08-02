import { Inject, Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import type { PersistedOrder } from '../../application/ports/create-order-persistence';
import type { GetOrderPersistence } from '../../application/ports/get-order-persistence';
import { orderRelations, serializeOrder } from './order-persistence.mapper';

@Injectable()
export class PrismaGetOrderPersistence implements GetOrderPersistence {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findById(orderId: string): Promise<PersistedOrder | null> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: orderRelations,
    });

    return order ? serializeOrder(order) : null;
  }
}
