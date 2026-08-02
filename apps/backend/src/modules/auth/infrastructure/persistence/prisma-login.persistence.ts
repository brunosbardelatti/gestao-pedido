import { Inject, Injectable } from '@nestjs/common';
import { ActorType } from '@prisma/client';

import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import type {
  CreateLoginSessionInput,
  LoginPersistence,
} from '../../application/ports/login-persistence';

@Injectable()
export class PrismaLoginPersistence implements LoginPersistence {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async createSessionWithAudit(input: CreateLoginSessionInput): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.session.create({
        data: {
          userId: input.userId,
          tokenHash: input.tokenHash,
          expiresAt: input.expiresAt,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
        },
      }),
      this.prisma.auditLog.create({
        data: {
          actorType: ActorType.USER,
          userId: input.userId,
          action: 'AUTH_LOGIN',
          entityType: 'User',
          entityId: input.userId,
          requestId: input.requestId,
        },
      }),
    ]);
  }
}
