import type { UserRole } from '../../domain/entities/auth-user';
import { CannotDeactivateOwnAccountError } from '../../domain/errors/cannot-deactivate-own-account.error';
import { InsufficientRoleError } from '../../domain/errors/insufficient-role.error';
import { UserNotFoundError } from '../../domain/errors/user-not-found.error';
import type { UserSummary, UserManagementPersistence } from '../ports/user-management-persistence';

export interface UpdateUserInput {
  actor: { id: string; role: UserRole };
  targetUserId: string;
  name?: string;
  role?: UserRole;
  active?: boolean;
  requestId?: string;
}

export class UpdateUserUseCase {
  constructor(private readonly persistence: UserManagementPersistence) {}

  async execute(input: UpdateUserInput): Promise<UserSummary> {
    if (input.actor.role !== 'ADMIN') {
      throw new InsufficientRoleError();
    }

    if (input.active === false && input.actor.id === input.targetUserId) {
      throw new CannotDeactivateOwnAccountError();
    }

    const result = await this.persistence.updateUserWithAudit({
      targetUserId: input.targetUserId,
      name: input.name,
      role: input.role,
      active: input.active,
      actorId: input.actor.id,
      requestId: input.requestId,
    });

    if (!result) {
      throw new UserNotFoundError();
    }

    return result;
  }
}
