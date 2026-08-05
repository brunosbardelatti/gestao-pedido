import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { CreateCustomerForm } from '@/components/customers/create-customer-form';
import { AppHeader } from '@/components/layout/app-header';
import { getCurrentUser } from '@/lib/auth';

export default async function NewCustomerPage(): Promise<React.JSX.Element> {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <main className="min-h-screen min-h-svh bg-background text-foreground">
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
          <p className="section-kicker">Clientes</p>
          <h1 className="mt-2 text-2xl font-semibold">Cadastrar cliente</h1>
          <CreateCustomerForm />
        </div>
      </section>
    </main>
  );
}
