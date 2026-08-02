import { describe, expect, it, vi } from 'vitest';

import type { PasswordHasher } from '../../../src/modules/auth/application/ports/password-hasher';
import type { ResetPasswordPersistence } from '../../../src/modules/auth/application/ports/reset-password-persistence';
import { ResetPasswordUseCase } from '../../../src/modules/auth/application/use-cases/reset-password.use-case';
import { CannotResetOwnPasswordError } from '../../../src/modules/auth/domain/errors/cannot-reset-own-password.error';
import { InsufficientRoleError } from '../../../src/modules/auth/domain/errors/insufficient-role.error';
import { UserNotFoundError } from '../../../src/modules/auth/domain/errors/user-not-found.error';

const adminId = '55c1e5bb-4795-485b-af90-a8d25d3d94b1';
const operatorId = 'cc7c1544-d055-4783-b50b-30eaf06f859f';

function makeSubject(targetExists = true) {
  const passwords: PasswordHasher = {
    hash: vi.fn().mockResolvedValue('argon2id-new-password-hash'),
    verify: vi.fn(),
  };
  const persistence: ResetPasswordPersistence = {
    resetPasswordWithAudit: vi.fn().mockResolvedValue(targetExists),
  };
  const useCase = new ResetPasswordUseCase(passwords, persistence);

  return { useCase, passwords, persistence };
}

describe('ResetPasswordUseCase', () => {
  it('stores only the new password hash and audits an administrator action', async () => {
    const subject = makeSubject();

    await subject.useCase.execute({
      actor: { id: adminId, role: 'ADMIN' },
      targetUserId: operatorId,
      newPassword: 'new-secure-password',
      requestId: 'req-reset-password',
    });

    expect(subject.passwords.hash).toHaveBeenCalledWith('new-secure-password');
    expect(subject.persistence.resetPasswordWithAudit).toHaveBeenCalledWith({
      actorId: adminId,
      targetUserId: operatorId,
      passwordHash: 'argon2id-new-password-hash',
      requestId: 'req-reset-password',
    });
  });

  it('rejects an operator before hashing or persisting the password', async () => {
    const subject = makeSubject();

    await expect(
      subject.useCase.execute({
        actor: { id: operatorId, role: 'OPERATOR' },
        targetUserId: adminId,
        newPassword: 'new-secure-password',
      }),
    ).rejects.toBeInstanceOf(InsufficientRoleError);

    expect(subject.passwords.hash).not.toHaveBeenCalled();
    expect(subject.persistence.resetPasswordWithAudit).not.toHaveBeenCalled();
  });

  it('rejects an administrator resetting their own password through this flow', async () => {
    const subject = makeSubject();

    await expect(
      subject.useCase.execute({
        actor: { id: adminId, role: 'ADMIN' },
        targetUserId: adminId,
        newPassword: 'new-secure-password',
      }),
    ).rejects.toBeInstanceOf(CannotResetOwnPasswordError);

    expect(subject.passwords.hash).not.toHaveBeenCalled();
    expect(subject.persistence.resetPasswordWithAudit).not.toHaveBeenCalled();
  });

  it('returns not found when the target user does not exist', async () => {
    const subject = makeSubject(false);

    await expect(
      subject.useCase.execute({
        actor: { id: adminId, role: 'ADMIN' },
        targetUserId: operatorId,
        newPassword: 'new-secure-password',
      }),
    ).rejects.toBeInstanceOf(UserNotFoundError);
  });
});
