import { Inject, Injectable } from '@nestjs/common';
import { ActorType } from '@prisma/client';

import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import type {
  ChangeOwnPasswordPersistence,
  ChangeOwnPasswordPersistenceInput,
} from '../../application/ports/change-own-password-persistence';

@Injectable()
export class PrismaChangeOwnPasswordPersistence
  implements ChangeOwnPasswordPersistence
{
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findPasswordHash(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });
    return user?.passwordHash ?? null;
  }

  async updatePasswordWithAudit(
    input: ChangeOwnPasswordPersistenceInput,
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: input.userId },
        data: { passwordHash: input.newPasswordHash },
      }),
      this.prisma.auditLog.create({
        data: {
          actorType: ActorType.USER,
          userId: input.userId,
          action: 'USER_PASSWORD_CHANGED',
          entityType: 'User',
          entityId: input.userId,
          requestId: input.requestId,
        },
      }),
    ]);
  }
}
