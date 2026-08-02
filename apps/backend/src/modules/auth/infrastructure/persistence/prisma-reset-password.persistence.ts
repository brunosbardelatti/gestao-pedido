import { Inject, Injectable } from '@nestjs/common';
import { ActorType } from '@prisma/client';

import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import type {
  ResetPasswordPersistence,
  ResetPasswordPersistenceInput,
} from '../../application/ports/reset-password-persistence';

@Injectable()
export class PrismaResetPasswordPersistence
  implements ResetPasswordPersistence
{
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async resetPasswordWithAudit(
    input: ResetPasswordPersistenceInput,
  ): Promise<boolean> {
    return this.prisma.$transaction(async (transaction) => {
      const update = await transaction.user.updateMany({
        where: { id: input.targetUserId },
        data: { passwordHash: input.passwordHash },
      });

      if (update.count === 0) {
        return false;
      }

      await transaction.auditLog.create({
        data: {
          actorType: ActorType.USER,
          userId: input.actorId,
          action: 'USER_PASSWORD_RESET',
          entityType: 'User',
          entityId: input.targetUserId,
          requestId: input.requestId,
        },
      });

      return true;
    });
  }
}
