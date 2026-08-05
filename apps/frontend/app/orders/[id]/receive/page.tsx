import { ArrowLeft, LockKeyhole } from 'lucide-react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { AppHeader } from '@/components/layout/app-header';
import { ReceiveOrderForm } from '@/components/orders/receive-order-form';
import { getCurrentUser } from '@/lib/auth';
import { getOrder } from '@/lib/orders';

interface ReceiveOrderPageProps {
  params: Promise<{ id: string }>;
}

export default async function ReceiveOrderPage({
  params,
}: ReceiveOrderPageProps): Promise<React.JSX.Element> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();

  return (
    <main className="min-h-screen min-h-svh bg-background text-foreground">
      <AppHeader user={user} />
      <section className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
        <Link
          href={`/orders/${order.id}/edit`}
          className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Voltar para o pedido
        </Link>
        <div className="mt-8">
          <p className="section-kicker">Pedidos</p>
          <h1 className="mt-2 text-2xl font-semibold">Receber pedido</h1>
          {order.status === 'OPEN' ? (
            <ReceiveOrderForm order={order} />
          ) : (
            <div
              role="status"
              className="mt-8 flex max-w-3xl items-start gap-3 border-y border-border py-5 text-sm"
            >
              <LockKeyhole
                className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <div>
                <p className="font-semibold">Recebimento indisponível</p>
                <p className="mt-1 text-muted-foreground">
                  {order.status === 'RECEIVED'
                    ? 'Este pedido já foi recebido.'
                    : 'Este pedido foi cancelado.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
