import type { UserRole } from '../../domain/entities/auth-user';
import { InsufficientRoleError } from '../../domain/errors/insufficient-role.error';
import type { UserListResult, UserManagementPersistence } from '../ports/user-management-persistence';

export interface ListUsersInput {
  actor: { role: UserRole };
  page: number;
  pageSize: number;
}

export class ListUsersUseCase {
  constructor(private readonly persistence: UserManagementPersistence) {}

  async execute(input: ListUsersInput): Promise<UserListResult> {
    if (input.actor.role !== 'ADMIN') {
      throw new InsufficientRoleError();
    }

    return this.persistence.listUsers({
      page: input.page,
      pageSize: input.pageSize,
    });
  }
}
