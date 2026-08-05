import { Plus } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AppHeader } from '@/components/layout/app-header';
import { UserList } from '@/components/users/user-list';
import { getCurrentUser } from '@/lib/auth';
import { listUsers } from '@/lib/users';

export default async function UsersPage(): Promise<React.JSX.Element> {
  const user = await getCurrentUser();

  if (!user) redirect('/login');
  if (user.role !== 'ADMIN') redirect('/');

  const result = await listUsers();

  return (
    <main className="min-h-screen min-h-svh bg-background text-foreground">
      <AppHeader user={user} />
      <section className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
        <div className="flex items-center justify-between">
          <div>
            <p className="section-kicker">Administração</p>
            <h1 className="mt-2 text-2xl font-semibold">Usuários</h1>
          </div>
          <Link
            href="/users/new"
            className="inline-flex min-h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Plus className="size-4" aria-hidden />
            Novo usuário
          </Link>
        </div>
        {result ? (
          <UserList users={result.users} />
        ) : (
          <p className="mt-8 text-sm text-destructive">
            Não foi possível carregar os usuários.
          </p>
        )}
      </section>
    </main>
  );
}
