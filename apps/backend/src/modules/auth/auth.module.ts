import { Module } from '@nestjs/common';

import {
  CLOCK,
  LOGIN_PERSISTENCE,
  PASSWORD_HASHER,
  SESSION_REPOSITORY,
  SESSION_TOKEN_SERVICE,
  USER_REPOSITORY,
} from './application/ports/auth.tokens';
import type { Clock } from './application/ports/clock';
import type { LoginPersistence } from './application/ports/login-persistence';
import type { PasswordHasher } from './application/ports/password-hasher';
import type { SessionTokenService } from './application/ports/session-token.service';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { GetCurrentUserUseCase } from './application/use-cases/get-current-user.use-case';
import type { SessionRepository } from './domain/repositories/session.repository';
import type { UserRepository } from './domain/repositories/user.repository';
import { Argon2PasswordHasher } from './infrastructure/cryptography/argon2-password-hasher';
import { CryptoSessionTokenService } from './infrastructure/cryptography/crypto-session-token.service';
import { PrismaLoginPersistence } from './infrastructure/persistence/prisma-login.persistence';
import { PrismaSessionRepository } from './infrastructure/persistence/prisma-session.repository';
import { PrismaUserRepository } from './infrastructure/persistence/prisma-user.repository';
import { SystemClock } from './infrastructure/system-clock';
import { AuthController } from './presentation/auth.controller';

function sessionTtlMs(): number {
  const seconds = Number(process.env.SESSION_TTL_SECONDS ?? 28_800);
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1_000 : 28_800_000;
}

@Module({
  controllers: [AuthController],
  providers: [
    PrismaUserRepository,
    PrismaLoginPersistence,
    PrismaSessionRepository,
    Argon2PasswordHasher,
    CryptoSessionTokenService,
    SystemClock,
    { provide: USER_REPOSITORY, useExisting: PrismaUserRepository },
    { provide: LOGIN_PERSISTENCE, useExisting: PrismaLoginPersistence },
    { provide: SESSION_REPOSITORY, useExisting: PrismaSessionRepository },
    { provide: PASSWORD_HASHER, useExisting: Argon2PasswordHasher },
    { provide: SESSION_TOKEN_SERVICE, useExisting: CryptoSessionTokenService },
    { provide: CLOCK, useExisting: SystemClock },
    {
      provide: LoginUseCase,
      inject: [
        USER_REPOSITORY,
        PASSWORD_HASHER,
        SESSION_TOKEN_SERVICE,
        LOGIN_PERSISTENCE,
        CLOCK,
      ],
      useFactory: (
        users: UserRepository,
        passwords: PasswordHasher,
        tokens: SessionTokenService,
        persistence: LoginPersistence,
        clock: Clock,
      ) =>
        new LoginUseCase(
          users,
          passwords,
          tokens,
          persistence,
          clock,
          sessionTtlMs(),
        ),
    },
    {
      provide: GetCurrentUserUseCase,
      inject: [SESSION_REPOSITORY, SESSION_TOKEN_SERVICE, CLOCK],
      useFactory: (
        sessions: SessionRepository,
        tokens: SessionTokenService,
        clock: Clock,
      ) => new GetCurrentUserUseCase(sessions, tokens, clock),
    },
  ],
})
export class AuthModule {}
