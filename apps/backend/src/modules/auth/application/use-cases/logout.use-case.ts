import { AuthenticationRequiredError } from '../../domain/errors/authentication-required.error';
import type { Clock } from '../ports/clock';
import type { LogoutPersistence } from '../ports/logout-persistence';
import type { SessionTokenService } from '../ports/session-token.service';

export interface LogoutInput {
  token?: string;
  requestId?: string;
}

export class LogoutUseCase {
  constructor(
    private readonly persistence: LogoutPersistence,
    private readonly tokens: SessionTokenService,
    private readonly clock: Clock,
  ) {}

  async execute(input: LogoutInput): Promise<void> {
    if (!input.token) {
      throw new AuthenticationRequiredError();
    }

    const result = await this.persistence.revokeSessionWithAudit({
      tokenHash: this.tokens.hash(input.token),
      revokedAt: this.clock.now(),
      requestId: input.requestId,
    });

    if (result === 'NOT_FOUND') {
      throw new AuthenticationRequiredError();
    }
  }
}
