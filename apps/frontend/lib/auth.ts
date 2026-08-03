import { cookies } from 'next/headers';

export interface CurrentUser {
  id: string;
  name: string;
  login: string;
  role: 'ADMIN' | 'OPERATOR';
  active: boolean;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const apiUrl = process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

  try {
    const response = await fetch(`${apiUrl}/api/v1/auth/me`, {
      headers: { Cookie: cookieStore.toString() },
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    const body = (await response.json()) as { data: CurrentUser };
    return body.data;
  } catch {
    return null;
  }
}

