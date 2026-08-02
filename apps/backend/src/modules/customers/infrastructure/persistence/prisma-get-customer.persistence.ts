import { Inject, Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import type { PersistedCustomer } from '../../application/ports/create-customer-persistence';
import type { GetCustomerPersistence } from '../../application/ports/get-customer-persistence';

@Injectable()
export class PrismaGetCustomerPersistence implements GetCustomerPersistence {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  findById(customerId: string): Promise<PersistedCustomer | null> {
    return this.prisma.customer.findUnique({
      where: { id: customerId },
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
  }
}
