import type { UserRole } from '../../domain/entities/auth-user';
import { AuthenticationRequiredError } from '../../domain/errors/authentication-required.error';
import type { SessionRepository } from '../../domain/repositories/session.repository';
import type { ApiKeyValidator } from '../ports/api-key-validator';
import type { Clock } from '../ports/clock';
import type { SessionTokenService } from '../ports/session-token.service';

export interface GetCurrentUserInput {
  token?: string;
  apiKey?: string;
}

export interface CurrentUserOutput {
  id: string;
  name: string;
  login: string;
  role: UserRole;
  active: boolean;
  apiKeyId?: string;
}

export class GetCurrentUserUseCase {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly tokens: SessionTokenService,
    private readonly clock: Clock,
    private readonly apiKeyValidator?: ApiKeyValidator,
  ) {}

  async execute(input: GetCurrentUserInput): Promise<CurrentUserOutput> {
    if (input.token) {
      const tokenHash = this.tokens.hash(input.token);
      const user = await this.sessions.findUserByActiveSession(
        tokenHash,
        this.clock.now(),
      );

      if (user) {
        return {
          id: user.id,
          name: user.name,
          login: user.login,
          role: user.role,
          active: user.active,
        };
      }
    }

    if (input.apiKey && this.apiKeyValidator) {
      const identity = await this.apiKeyValidator.validate(
        input.apiKey,
        this.clock.now(),
      );

      if (identity) {
        return {
          id: `api-key:${identity.apiKeyId}`,
          name: identity.name,
          login: `api-key:${identity.apiKeyId}`,
          role: 'OPERATOR',
          active: true,
          apiKeyId: identity.apiKeyId,
        };
      }
    }

    throw new AuthenticationRequiredError();
  }
}
