import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import type {
  ListCustomersPersistence,
  ListCustomersPersistenceInput,
  ListCustomersPersistenceResult,
} from '../../application/ports/list-customers-persistence';

@Injectable()
export class PrismaListCustomersPersistence
  implements ListCustomersPersistence
{
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(
    input: ListCustomersPersistenceInput,
  ): Promise<ListCustomersPersistenceResult> {
    const where: Prisma.CustomerWhereInput = {
      cpf: input.cpf,
      ...(input.phone ? { phone: { contains: input.phone } } : {}),
      ...(input.search
        ? {
            name: {
              contains: input.search,
              mode: Prisma.QueryMode.insensitive,
            },
          }
        : {}),
    };
    const select = {
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
    } satisfies Prisma.CustomerSelect;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        where,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
        select,
      }),
      this.prisma.customer.count({ where }),
    ]);

    return { items, total };
  }
}
