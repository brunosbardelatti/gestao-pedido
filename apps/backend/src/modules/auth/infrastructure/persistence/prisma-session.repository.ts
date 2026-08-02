import { Inject, Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import type { AuthUser } from '../../domain/entities/auth-user';
import type { SessionRepository } from '../../domain/repositories/session.repository';

@Injectable()
export class PrismaSessionRepository implements SessionRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findUserByActiveSession(
    tokenHash: string,
    now: Date,
  ): Promise<AuthUser | null> {
    const session = await this.prisma.session.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: now },
        user: { active: true },
      },
      select: {
        user: {
          select: {
            id: true,
            name: true,
            login: true,
            normalizedLogin: true,
            passwordHash: true,
            role: true,
            active: true,
          },
        },
      },
    });

    return session?.user ?? null;
  }
}
