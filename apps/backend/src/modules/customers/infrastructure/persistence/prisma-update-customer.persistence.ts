import { Inject, Injectable } from '@nestjs/common';
import { ActorType, Prisma } from '@prisma/client';

import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import type {
  UpdateCustomerPersistence,
  UpdateCustomerPersistenceInput,
  UpdateCustomerPersistenceResult,
} from '../../application/ports/update-customer-persistence';

@Injectable()
export class PrismaUpdateCustomerPersistence
  implements UpdateCustomerPersistence
{
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async updateWithAudit(
    input: UpdateCustomerPersistenceInput,
  ): Promise<UpdateCustomerPersistenceResult> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const current = await transaction.customer.findUnique({
          where: { id: input.customerId },
          select: { id: true },
        });
        if (!current) return { status: 'not_found' };

        const customer = await transaction.customer.update({
          where: { id: input.customerId },
          data: {
            name: input.name,
            cpf: input.cpf,
            phone: input.phone,
            addressLine: input.addressLine,
            city: input.city,
            state: input.state,
            postalCode: input.postalCode,
            updatedById: input.actorId,
          },
          select: {
            id: true,
            name: true,
            cpf: true,
            phone: true,
            addressLine: true,
            city: true,
            state: true,
            postalCode: true,
            active: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        await transaction.auditLog.create({
          data: {
            actorType: ActorType.USER,
            userId: input.actorId,
            action: 'CUSTOMER_UPDATED',
            entityType: 'Customer',
            entityId: customer.id,
            requestId: input.requestId,
          },
        });

        return { status: 'updated', customer };
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return { status: 'conflict' };
      }
      throw error;
    }
  }
}
