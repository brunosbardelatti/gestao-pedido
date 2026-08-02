import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AppHeader } from '@/components/layout/app-header';
import { CreateOrderForm } from '@/components/orders/create-order-form';
import { getCurrentUser } from '@/lib/auth';
import { getOrderCatalog } from '@/lib/orders';

function currentLocalDate(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export default async function NewOrderPage(): Promise<React.JSX.Element> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const catalog = await getOrderCatalog();

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
          <p className="section-kicker">Pedidos</p>
          <h1 className="mt-2 text-2xl font-semibold">Criar pedido</h1>
          <CreateOrderForm
            brands={catalog?.brands ?? []}
            products={catalog?.products ?? []}
            initialOrderDate={currentLocalDate()}
            referenceError={
              catalog ? undefined : 'Não foi possível carregar o catálogo.'
            }
          />
        </div>
      </section>
    </main>
  );
}
