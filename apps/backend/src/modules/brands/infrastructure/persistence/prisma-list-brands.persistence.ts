import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import type {
  ListBrandsPersistence,
  ListBrandsPersistenceInput,
  ListBrandsPersistenceOutput,
} from '../../application/ports/list-brands-persistence';

@Injectable()
export class PrismaListBrandsPersistence implements ListBrandsPersistence {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(
    input: ListBrandsPersistenceInput,
  ): Promise<ListBrandsPersistenceOutput> {
    const where: Prisma.BrandWhereInput = input.search
      ? { name: { contains: input.search, mode: 'insensitive' } }
      : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.brand.findMany({
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
      this.prisma.brand.count({ where }),
    ]);

    return { items, total };
  }
}
