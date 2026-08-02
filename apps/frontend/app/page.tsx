import { Boxes, Plus, ShoppingBag, Tags } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AppHeader } from '@/components/layout/app-header';
import { getCurrentUser } from '@/lib/auth';

export default async function HomePage(): Promise<React.JSX.Element> {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <main className="min-h-svh bg-background text-foreground">
      <AppHeader user={user} />
      <section className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <p className="section-kicker">Visão geral</p>
        <h1 className="mt-2 text-2xl font-semibold">Operação</h1>
        <div className="mt-8 divide-y divide-border border-y border-border">
          <div className="workspace-row">
            <Tags aria-hidden />
            <div>
              <h2>Catálogo</h2>
              <p>Marcas, categorias e produtos.</p>
            </div>
            <div className="workspace-actions">
              <Link href="/brands/new" className="workspace-action">
                <Plus className="size-4" aria-hidden />
                Cadastrar marca
              </Link>
              <Link href="/categories/new" className="workspace-action">
                <Plus className="size-4" aria-hidden />
                Cadastrar categoria
              </Link>
              <Link href="/products/new" className="workspace-action">
                <Plus className="size-4" aria-hidden />
                Cadastrar produto
              </Link>
            </div>
          </div>
          <div className="workspace-row">
            <Boxes aria-hidden />
            <div>
              <h2>Estoque</h2>
              <p>Consulta de saldos e movimentações.</p>
            </div>
            <span>Em breve</span>
          </div>
          <div className="workspace-row">
            <ShoppingBag aria-hidden />
            <div>
              <h2>Pedidos e vendas</h2>
              <p>Os próximos fluxos serão adicionados por caso de uso.</p>
            </div>
            <span>Em breve</span>
          </div>
        </div>
      </section>
    </main>
  );
}
