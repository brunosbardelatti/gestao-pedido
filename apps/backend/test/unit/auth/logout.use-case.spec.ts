import { describe, expect, it, vi } from 'vitest';

import type { LogoutPersistence } from '../../../src/modules/auth/application/ports/logout-persistence';
import type { SessionTokenService } from '../../../src/modules/auth/application/ports/session-token.service';
import { LogoutUseCase } from '../../../src/modules/auth/application/use-cases/logout.use-case';
import { AuthenticationRequiredError } from '../../../src/modules/auth/domain/errors/authentication-required.error';

function makeSubject(result: 'REVOKED' | 'ALREADY_REVOKED' | 'NOT_FOUND' = 'REVOKED') {
  const persistence: LogoutPersistence = {
    revokeSessionWithAudit: vi.fn().mockResolvedValue(result),
  };
  const tokens: SessionTokenService = {
    generate: vi.fn(),
    hash: vi.fn().mockReturnValue('session-token-hash'),
  };
  const now = new Date('2026-08-02T12:00:00.000Z');
  const useCase = new LogoutUseCase(persistence, tokens, { now: () => now });

  return { useCase, persistence, tokens, now };
}

describe('LogoutUseCase', () => {
  it('revokes the current session and records the request context', async () => {
    const subject = makeSubject();

    await subject.useCase.execute({
      token: 'session-secret',
      requestId: 'req-logout',
    });

    expect(subject.tokens.hash).toHaveBeenCalledWith('session-secret');
    expect(subject.persistence.revokeSessionWithAudit).toHaveBeenCalledWith({
      tokenHash: 'session-token-hash',
      revokedAt: subject.now,
      requestId: 'req-logout',
    });
  });

  it('rejects a request without a session token', async () => {
    const subject = makeSubject();

    await expect(subject.useCase.execute({})).rejects.toBeInstanceOf(
      AuthenticationRequiredError,
    );

    expect(subject.persistence.revokeSessionWithAudit).not.toHaveBeenCalled();
  });

  it('rejects an unknown or expired session', async () => {
    const subject = makeSubject('NOT_FOUND');

    await expect(
      subject.useCase.execute({ token: 'invalid-session' }),
    ).rejects.toBeInstanceOf(AuthenticationRequiredError);
  });

  it('accepts an already revoked session idempotently', async () => {
    const subject = makeSubject('ALREADY_REVOKED');

    await expect(
      subject.useCase.execute({ token: 'session-secret' }),
    ).resolves.toBeUndefined();
  });
});
