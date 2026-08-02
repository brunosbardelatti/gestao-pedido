import { describe, expect, it, vi } from 'vitest';

import { GetCurrentUserUseCase } from '../../../src/modules/auth/application/use-cases/get-current-user.use-case';
import type { SessionRepository } from '../../../src/modules/auth/domain/repositories/session.repository';
import type { SessionTokenService } from '../../../src/modules/auth/application/ports/session-token.service';
import { AuthenticationRequiredError } from '../../../src/modules/auth/domain/errors/authentication-required.error';

const authenticatedUser = {
  id: '55c1e5bb-4795-485b-af90-a8d25d3d94b1',
  name: 'Ana Silva',
  login: 'Ana',
  normalizedLogin: 'ana',
  passwordHash: 'argon2id-hash',
  role: 'ADMIN' as const,
  active: true,
};

function makeSubject(foundUser = authenticatedUser) {
  const sessions: SessionRepository = {
    findUserByActiveSession: vi.fn().mockResolvedValue(foundUser),
  };
  const tokens: SessionTokenService = {
    generate: vi.fn(),
    hash: vi.fn().mockReturnValue('session-token-hash'),
  };
  const now = new Date('2026-08-01T12:00:00.000Z');
  const useCase = new GetCurrentUserUseCase(sessions, tokens, {
    now: () => now,
  });

  return { useCase, sessions, tokens, now };
}

describe('GetCurrentUserUseCase', () => {
  it('returns the active user associated with a valid session', async () => {
    const subject = makeSubject();

    const result = await subject.useCase.execute({ token: 'session-secret' });

    expect(subject.tokens.hash).toHaveBeenCalledWith('session-secret');
    expect(subject.sessions.findUserByActiveSession).toHaveBeenCalledWith(
      'session-token-hash',
      subject.now,
    );
    expect(result).toEqual({
      id: authenticatedUser.id,
      name: authenticatedUser.name,
      login: authenticatedUser.login,
      role: authenticatedUser.role,
      active: true,
    });
  });

  it('rejects a request without a session token', async () => {
    const subject = makeSubject();

    await expect(subject.useCase.execute({})).rejects.toBeInstanceOf(
      AuthenticationRequiredError,
    );

    expect(subject.sessions.findUserByActiveSession).not.toHaveBeenCalled();
  });

  it('rejects a session that is expired, revoked or belongs to an inactive user', async () => {
    const subject = makeSubject();
    vi.mocked(subject.sessions.findUserByActiveSession).mockResolvedValue(null);

    await expect(
      subject.useCase.execute({ token: 'invalid-session' }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });
});
