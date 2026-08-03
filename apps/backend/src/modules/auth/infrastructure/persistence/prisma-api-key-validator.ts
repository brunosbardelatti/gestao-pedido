import { createHash } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';
import { ApiKeyStatus } from '@prisma/client';

import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import type {
  ApiKeyIdentity,
  ApiKeyValidator,
} from '../../application/ports/api-key-validator';

@Injectable()
export class PrismaApiKeyValidator implements ApiKeyValidator {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async validate(
    plainTextKey: string,
    now: Date,
  ): Promise<ApiKeyIdentity | null> {
    const keyHash = createHash('sha256').update(plainTextKey).digest('hex');

    const apiKey = await this.prisma.apiKey.findUnique({
      where: { keyHash },
      select: {
        id: true,
        name: true,
        scopes: true,
        status: true,
        expiresAt: true,
      },
    });

    if (!apiKey) return null;
    if (apiKey.status !== ApiKeyStatus.ACTIVE) return null;
    if (apiKey.expiresAt && apiKey.expiresAt <= now) return null;

    await this.prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: now },
    });

    return {
      apiKeyId: apiKey.id,
      name: apiKey.name,
      scopes: apiKey.scopes,
    };
  }
}
