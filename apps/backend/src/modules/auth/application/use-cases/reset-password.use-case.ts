import type { UserRole } from '../../domain/entities/auth-user';
import { CannotResetOwnPasswordError } from '../../domain/errors/cannot-reset-own-password.error';
import { InsufficientRoleError } from '../../domain/errors/insufficient-role.error';
import { UserNotFoundError } from '../../domain/errors/user-not-found.error';
import type { PasswordHasher } from '../ports/password-hasher';
import type { ResetPasswordPersistence } from '../ports/reset-password-persistence';

export interface ResetPasswordInput {
  actor: {
    id: string;
    role: UserRole;
  };
  targetUserId: string;
  newPassword: string;
  requestId?: string;
}

export class ResetPasswordUseCase {
  constructor(
    private readonly passwords: PasswordHasher,
    private readonly persistence: ResetPasswordPersistence,
  ) {}

  async execute(input: ResetPasswordInput): Promise<void> {
    if (input.actor.role !== 'ADMIN') {
      throw new InsufficientRoleError();
    }

    if (input.actor.id === input.targetUserId) {
      throw new CannotResetOwnPasswordError();
    }

    const passwordHash = await this.passwords.hash(input.newPassword);
    const targetExists = await this.persistence.resetPasswordWithAudit({
      actorId: input.actor.id,
      targetUserId: input.targetUserId,
      passwordHash,
      requestId: input.requestId,
    });

    if (!targetExists) {
      throw new UserNotFoundError();
    }
  }
}
