import { Inject, Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import type { AuthUser } from '../../domain/entities/auth-user';
import type { UserRepository } from '../../domain/repositories/user.repository';

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findByNormalizedLogin(normalizedLogin: string): Promise<AuthUser | null> {
    return this.prisma.user.findUnique({
      where: { normalizedLogin },
      select: {
        id: true,
        name: true,
        login: true,
        normalizedLogin: true,
        passwordHash: true,
        role: true,
        active: true,
      },
    });
  }
}
