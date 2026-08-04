import { CurrentPasswordIncorrectError } from '../../domain/errors/current-password-incorrect.error';
import { UserNotFoundError } from '../../domain/errors/user-not-found.error';
import type { ChangeOwnPasswordPersistence } from '../ports/change-own-password-persistence';
import type { PasswordHasher } from '../ports/password-hasher';

export interface ChangeOwnPasswordInput {
  actorId: string;
  currentPassword: string;
  newPassword: string;
  requestId?: string;
}

export class ChangeOwnPasswordUseCase {
  constructor(
    private readonly passwordHasher: PasswordHasher,
    private readonly persistence: ChangeOwnPasswordPersistence,
  ) {}

  async execute(input: ChangeOwnPasswordInput): Promise<void> {
    const currentHash = await this.persistence.findPasswordHash(input.actorId);

    if (!currentHash) {
      throw new UserNotFoundError();
    }

    const matches = await this.passwordHasher.verify(currentHash, input.currentPassword);

    if (!matches) {
      throw new CurrentPasswordIncorrectError();
    }

    const newHash = await this.passwordHasher.hash(input.newPassword);

    await this.persistence.updatePasswordWithAudit({
      userId: input.actorId,
      newPasswordHash: newHash,
      requestId: input.requestId,
    });
  }
}
