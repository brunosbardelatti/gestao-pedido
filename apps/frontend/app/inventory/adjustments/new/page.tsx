import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AdjustStockForm } from '@/components/inventory/adjust-stock-form';
import { AppHeader } from '@/components/layout/app-header';
import { getCurrentUser } from '@/lib/auth';
import { getInventoryAdjustmentProducts } from '@/lib/inventory';

export default async function NewInventoryAdjustmentPage(): Promise<React.JSX.Element> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const products = await getInventoryAdjustmentProducts();

  return (
    <main className="min-h-screen min-h-svh bg-background text-foreground">
      <AppHeader user={user} />
      <section className="mx-auto max-w-3xl px-5 py-8 sm:px-8 sm:py-10">
        <Link
          href="/inventory"
          className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Voltar para saldos
        </Link>

        <div className="mt-8">
          <p className="section-kicker">Estoque</p>
          <h1 className="mt-2 text-2xl font-semibold">Registrar ajuste</h1>
        </div>

        <div className="mt-8">
          <AdjustStockForm
            products={products ?? []}
            referenceError={
              products
                ? undefined
                : 'Não foi possível carregar os produtos e saldos.'
            }
          />
        </div>
      </section>
    </main>
  );
}
