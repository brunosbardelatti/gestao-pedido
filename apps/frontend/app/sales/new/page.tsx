import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AppHeader } from '@/components/layout/app-header';
import { CreateSaleForm } from '@/components/sales/create-sale-form';
import { getCurrentUser } from '@/lib/auth';
import { getSaleCatalog } from '@/lib/sales';

export default async function NewSalePage(): Promise<React.JSX.Element> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const catalog = await getSaleCatalog();

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
          <p className="section-kicker">Vendas</p>
          <h1 className="mt-2 text-2xl font-semibold">Registrar venda</h1>
          <CreateSaleForm
            products={catalog?.products ?? []}
            customers={catalog?.customers ?? []}
            referenceError={
              catalog ? undefined : 'Não foi possível carregar produtos e clientes.'
            }
          />
        </div>
      </section>
    </main>
  );
}
