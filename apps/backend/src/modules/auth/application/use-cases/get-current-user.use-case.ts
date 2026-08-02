import type { UserRole } from '../../domain/entities/auth-user';
import { AuthenticationRequiredError } from '../../domain/errors/authentication-required.error';
import type { SessionRepository } from '../../domain/repositories/session.repository';
import type { Clock } from '../ports/clock';
import type { SessionTokenService } from '../ports/session-token.service';

export interface GetCurrentUserInput {
  token?: string;
}

export interface CurrentUserOutput {
  id: string;
  name: string;
  login: string;
  role: UserRole;
  active: boolean;
}

export class GetCurrentUserUseCase {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly tokens: SessionTokenService,
    private readonly clock: Clock,
  ) {}

  async execute(input: GetCurrentUserInput): Promise<CurrentUserOutput> {
    if (!input.token) {
      throw new AuthenticationRequiredError();
    }

    const tokenHash = this.tokens.hash(input.token);
    const user = await this.sessions.findUserByActiveSession(
      tokenHash,
      this.clock.now(),
    );

    if (!user) {
      throw new AuthenticationRequiredError();
    }

    return {
      id: user.id,
      name: user.name,
      login: user.login,
      role: user.role,
      active: user.active,
    };
  }
}
