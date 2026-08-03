import { Inject, Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import type {
  ListApiKeysPersistence,
  ListApiKeysPersistenceInput,
  ListApiKeysPersistenceResult,
} from '../../application/ports/list-api-keys-persistence';

@Injectable()
export class PrismaListApiKeysPersistence implements ListApiKeysPersistence {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(
    input: ListApiKeysPersistenceInput,
  ): Promise<ListApiKeysPersistenceResult> {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.apiKey.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
      }),
      this.prisma.apiKey.count(),
    ]);

    return {
      items: items.map((key) => ({
        id: key.id,
        name: key.name,
        keyPrefix: key.keyPrefix,
        scopes: key.scopes,
        status: key.status,
        createdAt: key.createdAt.toISOString(),
        expiresAt: key.expiresAt?.toISOString() ?? null,
        lastUsedAt: key.lastUsedAt?.toISOString() ?? null,
        revokedAt: key.revokedAt?.toISOString() ?? null,
      })),
      total,
    };
  }
}
