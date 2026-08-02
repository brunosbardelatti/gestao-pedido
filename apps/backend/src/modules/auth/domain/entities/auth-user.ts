export const USER_ROLES = ['ADMIN', 'OPERATOR'] as const;

export type UserRole = (typeof USER_ROLES)[number];

export interface AuthUser {
  id: string;
  name: string;
  login: string;
  normalizedLogin: string;
  passwordHash: string;
  role: UserRole;
  active: boolean;
}
