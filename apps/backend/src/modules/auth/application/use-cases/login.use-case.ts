import type { UserRole } from '../../domain/entities/auth-user';
import { InvalidCredentialsError } from '../../domain/errors/invalid-credentials.error';
import type { UserRepository } from '../../domain/repositories/user.repository';
import type { Clock } from '../ports/clock';
import type { LoginPersistence } from '../ports/login-persistence';
import type { PasswordHasher } from '../ports/password-hasher';
import type { SessionTokenService } from '../ports/session-token.service';

export interface LoginInput {
  login: string;
  password: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface LoginOutput {
  user: {
    id: string;
    name: string;
    login: string;
    role: UserRole;
    active: boolean;
  };
  session: {
    token: string;
    expiresAt: Date;
  };
}

export class LoginUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly sessionTokenService: SessionTokenService,
    private readonly loginPersistence: LoginPersistence,
    private readonly clock: Clock,
    private readonly sessionTtlMs: number,
  ) {}

  async execute(input: LoginInput): Promise<LoginOutput> {
    const normalizedLogin = input.login.normalize('NFKC').trim().toLowerCase();
    const user = await this.userRepository.findByNormalizedLogin(normalizedLogin);

    if (!user) {
      throw new InvalidCredentialsError();
    }

    const passwordMatches = await this.passwordHasher.verify(
      user.passwordHash,
      input.password,
    );

    if (!passwordMatches || !user.active) {
      throw new InvalidCredentialsError();
    }

    const sessionToken = this.sessionTokenService.generate();
    const expiresAt = new Date(this.clock.now().getTime() + this.sessionTtlMs);

    await this.loginPersistence.createSessionWithAudit({
      userId: user.id,
      tokenHash: sessionToken.hash,
      expiresAt,
      requestId: input.requestId,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        login: user.login,
        role: user.role,
        active: user.active,
      },
      session: {
        token: sessionToken.plainText,
        expiresAt,
      },
    };
  }
}
