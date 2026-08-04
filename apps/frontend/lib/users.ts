import { cookies } from 'next/headers';

export interface UserSummary {
  id: string;
  name: string;
  login: string;
  role: 'ADMIN' | 'OPERATOR';
  active: boolean;
  createdAt: string;
}

export interface UserListMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface UserListResult {
  users: UserSummary[];
  meta: UserListMeta;
}

const apiUrl =
  process.env.BACKEND_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'http://localhost:3001';

export async function listUsers(
  page = 1,
  pageSize = 20,
): Promise<UserListResult | null> {
  const cookieStore = await cookies();

  try {
    const response = await fetch(
      `${apiUrl}/api/v1/users?page=${page}&pageSize=${pageSize}`,
      {
        headers: { Cookie: cookieStore.toString() },
        cache: 'no-store',
      },
    );

    if (!response.ok) return null;

    const body = (await response.json()) as {
      data: UserSummary[];
      meta: UserListMeta;
    };
    return { users: body.data, meta: body.meta };
  } catch {
    return null;
  }
}

export async function getUser(userId: string): Promise<UserSummary | null> {
  const result = await listUsers(1, 200);
  return result?.users.find((u) => u.id === userId) ?? null;
}
