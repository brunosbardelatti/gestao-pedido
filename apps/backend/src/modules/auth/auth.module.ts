import { Module } from '@nestjs/common';

import {
  API_KEY_VALIDATOR,
  CLOCK,
  LOGIN_PERSISTENCE,
  LOGOUT_PERSISTENCE,
  PASSWORD_HASHER,
  RESET_PASSWORD_PERSISTENCE,
  SESSION_REPOSITORY,
  SESSION_TOKEN_SERVICE,
  USER_REPOSITORY,
} from './application/ports/auth.tokens';
import type { ApiKeyValidator } from './application/ports/api-key-validator';
import type { Clock } from './application/ports/clock';
import type { LoginPersistence } from './application/ports/login-persistence';
import type { LogoutPersistence } from './application/ports/logout-persistence';
import type { PasswordHasher } from './application/ports/password-hasher';
import type { ResetPasswordPersistence } from './application/ports/reset-password-persistence';
import type { SessionTokenService } from './application/ports/session-token.service';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { GetCurrentUserUseCase } from './application/use-cases/get-current-user.use-case';
import { LogoutUseCase } from './application/use-cases/logout.use-case';
import { ResetPasswordUseCase } from './application/use-cases/reset-password.use-case';
import type { SessionRepository } from './domain/repositories/session.repository';
import type { UserRepository } from './domain/repositories/user.repository';
import { Argon2PasswordHasher } from './infrastructure/cryptography/argon2-password-hasher';
import { CryptoSessionTokenService } from './infrastructure/cryptography/crypto-session-token.service';
import { PrismaLoginPersistence } from './infrastructure/persistence/prisma-login.persistence';
import { PrismaLogoutPersistence } from './infrastructure/persistence/prisma-logout.persistence';
import { PrismaResetPasswordPersistence } from './infrastructure/persistence/prisma-reset-password.persistence';
import { PrismaSessionRepository } from './infrastructure/persistence/prisma-session.repository';
import { PrismaApiKeyValidator } from './infrastructure/persistence/prisma-api-key-validator';
import { PrismaUserRepository } from './infrastructure/persistence/prisma-user.repository';
import { SystemClock } from './infrastructure/system-clock';
import { AuthController } from './presentation/auth.controller';
import { UsersController } from './presentation/users.controller';

function sessionTtlMs(): number {
  const seconds = Number(process.env.SESSION_TTL_SECONDS ?? 28_800);
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1_000 : 28_800_000;
}

@Module({
  controllers: [AuthController, UsersController],
  providers: [
    PrismaUserRepository,
    PrismaLoginPersistence,
    PrismaLogoutPersistence,
    PrismaResetPasswordPersistence,
    PrismaSessionRepository,
    PrismaApiKeyValidator,
    Argon2PasswordHasher,
    CryptoSessionTokenService,
    SystemClock,
    { provide: USER_REPOSITORY, useExisting: PrismaUserRepository },
    { provide: LOGIN_PERSISTENCE, useExisting: PrismaLoginPersistence },
    { provide: LOGOUT_PERSISTENCE, useExisting: PrismaLogoutPersistence },
    {
      provide: RESET_PASSWORD_PERSISTENCE,
      useExisting: PrismaResetPasswordPersistence,
    },
    { provide: SESSION_REPOSITORY, useExisting: PrismaSessionRepository },
    { provide: PASSWORD_HASHER, useExisting: Argon2PasswordHasher },
    { provide: SESSION_TOKEN_SERVICE, useExisting: CryptoSessionTokenService },
    { provide: CLOCK, useExisting: SystemClock },
    { provide: API_KEY_VALIDATOR, useExisting: PrismaApiKeyValidator },
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
      inject: [SESSION_REPOSITORY, SESSION_TOKEN_SERVICE, CLOCK, API_KEY_VALIDATOR],
      useFactory: (
        sessions: SessionRepository,
        tokens: SessionTokenService,
        clock: Clock,
        apiKeyValidator: ApiKeyValidator,
      ) => new GetCurrentUserUseCase(sessions, tokens, clock, apiKeyValidator),
    },
    {
      provide: LogoutUseCase,
      inject: [LOGOUT_PERSISTENCE, SESSION_TOKEN_SERVICE, CLOCK],
      useFactory: (
        persistence: LogoutPersistence,
        tokens: SessionTokenService,
        clock: Clock,
      ) => new LogoutUseCase(persistence, tokens, clock),
    },
    {
      provide: ResetPasswordUseCase,
      inject: [PASSWORD_HASHER, RESET_PASSWORD_PERSISTENCE],
      useFactory: (
        passwords: PasswordHasher,
        persistence: ResetPasswordPersistence,
      ) => new ResetPasswordUseCase(passwords, persistence),
    },
  ],
  exports: [GetCurrentUserUseCase],
})
export class AuthModule {}
