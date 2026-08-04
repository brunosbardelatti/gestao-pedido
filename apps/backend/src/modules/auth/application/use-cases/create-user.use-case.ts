import type { UserRole } from '../../domain/entities/auth-user';
import { InsufficientRoleError } from '../../domain/errors/insufficient-role.error';
import { LoginAlreadyTakenError } from '../../domain/errors/login-already-taken.error';
import type { PasswordHasher } from '../ports/password-hasher';
import type { UserSummary, UserManagementPersistence } from '../ports/user-management-persistence';

export interface CreateUserInput {
  actor: { id: string; role: UserRole };
  name: string;
  login: string;
  password: string;
  role: UserRole;
  requestId?: string;
}

export class CreateUserUseCase {
  constructor(
    private readonly passwordHasher: PasswordHasher,
    private readonly persistence: UserManagementPersistence,
  ) {}

  async execute(input: CreateUserInput): Promise<UserSummary> {
    if (input.actor.role !== 'ADMIN') {
      throw new InsufficientRoleError();
    }

    const normalizedLogin = input.login.normalize('NFKC').trim().toLowerCase();
    const existing = await this.persistence.findByNormalizedLogin(normalizedLogin);

    if (existing) {
      throw new LoginAlreadyTakenError();
    }

    const passwordHash = await this.passwordHasher.hash(input.password);

    return this.persistence.createUserWithAudit({
      name: input.name,
      login: input.login,
      normalizedLogin,
      passwordHash,
      role: input.role,
      actorId: input.actor.id,
      requestId: input.requestId,
    });
  }
}
