import { describe, expect, it, vi } from 'vitest';

import { InvalidCredentialsError } from '../../../src/modules/auth/domain/errors/invalid-credentials.error';
import { LoginUseCase } from '../../../src/modules/auth/application/use-cases/login.use-case';
import type { PasswordHasher } from '../../../src/modules/auth/application/ports/password-hasher';
import type { SessionTokenService } from '../../../src/modules/auth/application/ports/session-token.service';
import type { LoginPersistence } from '../../../src/modules/auth/application/ports/login-persistence';
import type { UserRepository } from '../../../src/modules/auth/domain/repositories/user.repository';

const user = {
  id: '55c1e5bb-4795-485b-af90-a8d25d3d94b1',
  name: 'Ana Silva',
  login: 'Ana',
  normalizedLogin: 'ana',
  passwordHash: 'argon2id-hash',
  role: 'ADMIN' as const,
  active: true,
};

function makeSubject(overrides?: { foundUser?: typeof user | null }) {
  const userRepository: UserRepository = {
    findByNormalizedLogin: vi
      .fn()
      .mockResolvedValue(
        overrides && 'foundUser' in overrides ? overrides.foundUser : user,
      ),
  };
  const passwordHasher: PasswordHasher = {
    verify: vi.fn().mockResolvedValue(true),
  };
  const sessionTokenService: SessionTokenService = {
    generate: vi.fn().mockReturnValue({
      plainText: 'session-secret',
      hash: 'session-secret-hash',
    }),
    hash: vi.fn(),
  };
  const loginPersistence: LoginPersistence = {
    createSessionWithAudit: vi.fn().mockResolvedValue(undefined),
  };
  const now = new Date('2026-08-01T12:00:00.000Z');
  const useCase = new LoginUseCase(
    userRepository,
    passwordHasher,
    sessionTokenService,
    loginPersistence,
    { now: () => now },
    8 * 60 * 60 * 1_000,
  );

  return {
    useCase,
    userRepository,
    passwordHasher,
    sessionTokenService,
    loginPersistence,
    now,
  };
}

describe('LoginUseCase', () => {
  it('creates an audited session for an active user with valid credentials', async () => {
    const subject = makeSubject();

    const result = await subject.useCase.execute({
      login: '  ANA ',
      password: 'correct-password',
      requestId: 'req-123',
      ipAddress: '127.0.0.1',
      userAgent: 'Vitest',
    });

    expect(subject.userRepository.findByNormalizedLogin).toHaveBeenCalledWith('ana');
    expect(subject.passwordHasher.verify).toHaveBeenCalledWith(
      'argon2id-hash',
      'correct-password',
    );
    expect(subject.loginPersistence.createSessionWithAudit).toHaveBeenCalledWith({
      userId: user.id,
      tokenHash: 'session-secret-hash',
      expiresAt: new Date('2026-08-01T20:00:00.000Z'),
      requestId: 'req-123',
      ipAddress: '127.0.0.1',
      userAgent: 'Vitest',
    });
    expect(result).toEqual({
      user: {
        id: user.id,
        name: user.name,
        login: user.login,
        role: user.role,
        active: true,
      },
      session: {
        token: 'session-secret',
        expiresAt: new Date('2026-08-01T20:00:00.000Z'),
      },
    });
  });

  it('rejects an unknown login without creating a session', async () => {
    const subject = makeSubject({ foundUser: null });

    await expect(
      subject.useCase.execute({ login: 'unknown', password: 'password' }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);

    expect(subject.loginPersistence.createSessionWithAudit).not.toHaveBeenCalled();
  });

  it('rejects an invalid password without revealing which credential failed', async () => {
    const subject = makeSubject();
    vi.mocked(subject.passwordHasher.verify).mockResolvedValue(false);

    await expect(
      subject.useCase.execute({ login: 'ana', password: 'wrong-password' }),
    ).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
      message: 'Login ou senha inválidos.',
    });

    expect(subject.loginPersistence.createSessionWithAudit).not.toHaveBeenCalled();
  });

  it('rejects an inactive user even when the password is valid', async () => {
    const subject = makeSubject({ foundUser: { ...user, active: false } });

    await expect(
      subject.useCase.execute({ login: 'ana', password: 'correct-password' }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);

    expect(subject.loginPersistence.createSessionWithAudit).not.toHaveBeenCalled();
  });
});
