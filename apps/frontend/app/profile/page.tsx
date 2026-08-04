import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { ChangePasswordForm } from '@/components/auth/change-password-form';
import { AppHeader } from '@/components/layout/app-header';
import { getCurrentUser } from '@/lib/auth';

export default async function ProfilePage(): Promise<React.JSX.Element> {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <main className="min-h-svh bg-background text-foreground">
      <AppHeader user={user} />
      <section className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
        <Link
          href="/"
          className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Voltar para operação
        </Link>
        <div className="mt-8">
          <p className="section-kicker">Conta</p>
          <h1 className="mt-2 text-2xl font-semibold">Meu perfil</h1>
          <div className="mt-6 border-b border-border pb-6">
            <p className="text-sm text-muted-foreground">Login</p>
            <p className="mt-1 font-medium">{user.login}</p>
            <p className="mt-3 text-sm text-muted-foreground">Nome</p>
            <p className="mt-1 font-medium">{user.name}</p>
            <p className="mt-3 text-sm text-muted-foreground">Perfil</p>
            <p className="mt-1 font-medium">
              {user.role === 'ADMIN' ? 'Administrador' : 'Operador'}
            </p>
          </div>
          <div className="mt-8">
            <h2 className="text-lg font-semibold">Alterar senha</h2>
            <ChangePasswordForm />
          </div>
        </div>
      </section>
    </main>
  );
}
