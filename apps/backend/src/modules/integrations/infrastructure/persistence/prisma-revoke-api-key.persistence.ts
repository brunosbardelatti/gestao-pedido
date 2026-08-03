import { Inject, Injectable } from '@nestjs/common';
import { ApiKeyStatus } from '@prisma/client';

import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import { ApiKeyAlreadyRevokedError } from '../../domain/errors/api-key-already-revoked.error';
import { ApiKeyNotFoundError } from '../../domain/errors/api-key-not-found.error';
import type {
  RevokeApiKeyPersistence,
  RevokeApiKeyPersistenceInput,
} from '../../application/ports/revoke-api-key-persistence';

@Injectable()
export class PrismaRevokeApiKeyPersistence implements RevokeApiKeyPersistence {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async revoke(input: RevokeApiKeyPersistenceInput): Promise<void> {
    const existing = await this.prisma.apiKey.findUnique({
      where: { id: input.apiKeyId },
      select: { id: true, status: true },
    });

    if (!existing) {
      throw new ApiKeyNotFoundError();
    }

    if (existing.status === ApiKeyStatus.REVOKED) {
      throw new ApiKeyAlreadyRevokedError();
    }

    const now = new Date();

    await this.prisma.$transaction([
      this.prisma.apiKey.update({
        where: { id: input.apiKeyId },
        data: { status: ApiKeyStatus.REVOKED, revokedAt: now },
      }),
      this.prisma.auditLog.create({
        data: {
          actorType: 'USER',
          userId: input.userId,
          action: 'API_KEY_REVOKED',
          entityType: 'ApiKey',
          entityId: input.apiKeyId,
          requestId: input.requestId,
        },
      }),
    ]);
  }
}
