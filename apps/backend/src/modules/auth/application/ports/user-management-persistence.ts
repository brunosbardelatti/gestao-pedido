import type { UserRole } from '../../domain/entities/auth-user';

export interface UserSummary {
  id: string;
  name: string;
  login: string;
  role: UserRole;
  active: boolean;
  createdAt: Date;
}

export interface UserListInput {
  page: number;
  pageSize: number;
}

export interface UserListResult {
  users: UserSummary[];
  total: number;
}

export interface CreateUserPersistenceInput {
  name: string;
  login: string;
  normalizedLogin: string;
  passwordHash: string;
  role: UserRole;
  actorId: string;
  requestId?: string;
}

export interface UpdateUserPersistenceInput {
  targetUserId: string;
  name?: string;
  role?: UserRole;
  active?: boolean;
  actorId: string;
  requestId?: string;
}

export interface UserManagementPersistence {
  listUsers(input: UserListInput): Promise<UserListResult>;
  findByNormalizedLogin(normalizedLogin: string): Promise<{ id: string } | null>;
  createUserWithAudit(input: CreateUserPersistenceInput): Promise<UserSummary>;
  updateUserWithAudit(input: UpdateUserPersistenceInput): Promise<UserSummary | null>;
}
