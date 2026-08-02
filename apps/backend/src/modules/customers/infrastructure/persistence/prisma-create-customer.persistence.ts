import { Inject, Injectable } from '@nestjs/common';
import { ActorType, Prisma } from '@prisma/client';

import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import type {
  CreateCustomerPersistence,
  CreateCustomerPersistenceInput,
  PersistedCustomer,
} from '../../application/ports/create-customer-persistence';

@Injectable()
export class PrismaCreateCustomerPersistence
  implements CreateCustomerPersistence
{
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async createWithAudit(
    input: CreateCustomerPersistenceInput,
  ): Promise<PersistedCustomer | null> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const customer = await transaction.customer.create({
          data: {
            name: input.name,
            cpf: input.cpf,
            phone: input.phone,
            addressLine: input.addressLine,
            city: input.city,
            state: input.state,
            postalCode: input.postalCode,
            createdById: input.actorId,
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
            action: 'CUSTOMER_CREATED',
            entityType: 'Customer',
            entityId: customer.id,
            requestId: input.requestId,
          },
        });

        return customer;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return null;
      }

      throw error;
    }
  }
}
