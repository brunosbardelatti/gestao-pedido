import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { AppHeader } from '@/components/layout/app-header';
import { ResetPasswordSection } from '@/components/users/reset-password-section';
import { UpdateUserForm } from '@/components/users/update-user-form';
import { getCurrentUser } from '@/lib/auth';
import { getUser } from '@/lib/users';

interface EditUserPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditUserPage({
  params,
}: EditUserPageProps): Promise<React.JSX.Element> {
  const currentUser = await getCurrentUser();

  if (!currentUser) redirect('/login');
  if (currentUser.role !== 'ADMIN') redirect('/');

  const { id } = await params;
  const targetUser = await getUser(id);

  if (!targetUser) notFound();

  const isSelf = currentUser.id === targetUser.id;

  return (
    <main className="min-h-screen min-h-svh bg-background text-foreground">
      <AppHeader user={currentUser} />
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
          <h1 className="mt-2 text-2xl font-semibold">Editar usuário</h1>
          <p className="mt-1 text-sm text-muted-foreground">Login: {targetUser.login}</p>
          <UpdateUserForm user={targetUser} isSelf={isSelf} />
          {!isSelf ? (
            <ResetPasswordSection userId={targetUser.id} userName={targetUser.name} />
          ) : null}
        </div>
      </section>
    </main>
  );
}
