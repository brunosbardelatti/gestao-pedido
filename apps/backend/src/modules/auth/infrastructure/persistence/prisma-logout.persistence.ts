import { Inject, Injectable } from '@nestjs/common';
import { ActorType } from '@prisma/client';

import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import type {
  LogoutPersistence,
  LogoutPersistenceResult,
  RevokeSessionInput,
} from '../../application/ports/logout-persistence';

@Injectable()
export class PrismaLogoutPersistence implements LogoutPersistence {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async revokeSessionWithAudit(
    input: RevokeSessionInput,
  ): Promise<LogoutPersistenceResult> {
    return this.prisma.$transaction(async (transaction) => {
      const session = await transaction.session.findUnique({
        where: { tokenHash: input.tokenHash },
        select: {
          id: true,
          userId: true,
          expiresAt: true,
          revokedAt: true,
          user: { select: { active: true } },
        },
      });

      if (
        !session ||
        !session.user.active ||
        session.expiresAt.getTime() <= input.revokedAt.getTime()
      ) {
        return 'NOT_FOUND';
      }

      if (session.revokedAt) {
        return 'ALREADY_REVOKED';
      }

      const update = await transaction.session.updateMany({
        where: { id: session.id, revokedAt: null },
        data: { revokedAt: input.revokedAt },
      });

      if (update.count === 0) {
        return 'ALREADY_REVOKED';
      }

      await transaction.auditLog.create({
        data: {
          actorType: ActorType.USER,
          userId: session.userId,
          action: 'AUTH_LOGOUT',
          entityType: 'User',
          entityId: session.userId,
          requestId: input.requestId,
        },
      });

      return 'REVOKED';
    });
  }
}
