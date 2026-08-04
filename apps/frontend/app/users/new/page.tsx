import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AppHeader } from '@/components/layout/app-header';
import { CreateUserForm } from '@/components/users/create-user-form';
import { getCurrentUser } from '@/lib/auth';

export default async function NewUserPage(): Promise<React.JSX.Element> {
  const user = await getCurrentUser();

  if (!user) redirect('/login');
  if (user.role !== 'ADMIN') redirect('/');

  return (
    <main className="min-h-svh bg-background text-foreground">
      <AppHeader user={user} />
      <section className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
        <Link
          href="/users"
          className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Voltar para usuários
        </Link>
        <div className="mt-8">
          <p className="section-kicker">Administração</p>
          <h1 className="mt-2 text-2xl font-semibold">Cadastrar usuário</h1>
          <CreateUserForm />
        </div>
      </section>
    </main>
  );
}
