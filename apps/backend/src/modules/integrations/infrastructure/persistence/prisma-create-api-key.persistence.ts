import { Inject, Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import type {
  CreateApiKeyPersistence,
  CreateApiKeyPersistenceInput,
  CreateApiKeyPersistenceResult,
} from '../../application/ports/create-api-key-persistence';

@Injectable()
export class PrismaCreateApiKeyPersistence implements CreateApiKeyPersistence {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(
    input: CreateApiKeyPersistenceInput,
  ): Promise<CreateApiKeyPersistenceResult> {
    const [apiKey] = await this.prisma.$transaction([
      this.prisma.apiKey.create({
        data: {
          name: input.name,
          keyPrefix: input.keyPrefix,
          keyHash: input.keyHash,
          scopes: input.scopes,
          expiresAt: input.expiresAt,
          createdById: input.createdById,
        },
      }),
      this.prisma.auditLog.create({
        data: {
          actorType: 'USER',
          userId: input.createdById,
          action: 'API_KEY_CREATED',
          entityType: 'ApiKey',
          requestId: input.requestId,
        },
      }),
    ]);

    return {
      id: apiKey.id,
      name: apiKey.name,
      keyPrefix: apiKey.keyPrefix,
      scopes: apiKey.scopes,
      expiresAt: apiKey.expiresAt?.toISOString() ?? null,
      createdAt: apiKey.createdAt.toISOString(),
    };
  }
}
