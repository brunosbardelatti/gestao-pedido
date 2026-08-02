import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import type {
  ListCategoriesPersistence,
  ListCategoriesPersistenceInput,
  ListCategoriesPersistenceOutput,
} from '../../application/ports/list-categories-persistence';

@Injectable()
export class PrismaListCategoriesPersistence
  implements ListCategoriesPersistence
{
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(
    input: ListCategoriesPersistenceInput,
  ): Promise<ListCategoriesPersistenceOutput> {
    const where: Prisma.CategoryWhereInput = input.search
      ? { name: { contains: input.search, mode: 'insensitive' } }
      : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.category.findMany({
        where,
        orderBy: [{ active: 'desc' }, { name: 'asc' }],
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
        select: {
          id: true,
          name: true,
          active: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.category.count({ where }),
    ]);

    return { items, total };
  }
}
