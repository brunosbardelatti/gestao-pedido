import { Inject, Injectable } from '@nestjs/common';
import { ActorType } from '@prisma/client';

import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import type {
  CreateUserPersistenceInput,
  UpdateUserPersistenceInput,
  UserListInput,
  UserListResult,
  UserManagementPersistence,
  UserSummary,
} from '../../application/ports/user-management-persistence';

@Injectable()
export class PrismaUserManagementPersistence implements UserManagementPersistence {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listUsers(input: UserListInput): Promise<UserListResult> {
    const skip = (input.page - 1) * input.pageSize;

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        skip,
        take: input.pageSize,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          login: true,
          role: true,
          active: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count(),
    ]);

    return { users, total };
  }

  async findByNormalizedLogin(normalizedLogin: string): Promise<{ id: string } | null> {
    return this.prisma.user.findUnique({
      where: { normalizedLogin },
      select: { id: true },
    });
  }

  async createUserWithAudit(input: CreateUserPersistenceInput): Promise<UserSummary> {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: input.name,
          login: input.login,
          normalizedLogin: input.normalizedLogin,
          passwordHash: input.passwordHash,
          role: input.role,
        },
        select: {
          id: true,
          name: true,
          login: true,
          role: true,
          active: true,
          createdAt: true,
        },
      });

      await tx.auditLog.create({
        data: {
          actorType: ActorType.USER,
          userId: input.actorId,
          action: 'USER_CREATED',
          entityType: 'User',
          entityId: user.id,
          requestId: input.requestId,
        },
      });

      return user;
    });
  }

  async updateUserWithAudit(input: UpdateUserPersistenceInput): Promise<UserSummary | null> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({
        where: { id: input.targetUserId },
        select: { id: true },
      });

      if (!existing) return null;

      const user = await tx.user.update({
        where: { id: input.targetUserId },
        data: {
          ...(input.name !== undefined && { name: input.name }),
          ...(input.role !== undefined && { role: input.role }),
          ...(input.active !== undefined && { active: input.active }),
        },
        select: {
          id: true,
          name: true,
          login: true,
          role: true,
          active: true,
          createdAt: true,
        },
      });

      await tx.auditLog.create({
        data: {
          actorType: ActorType.USER,
          userId: input.actorId,
          action: 'USER_UPDATED',
          entityType: 'User',
          entityId: input.targetUserId,
          requestId: input.requestId,
        },
      });

      return user;
    });
  }
}
