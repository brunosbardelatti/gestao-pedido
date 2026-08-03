import {
  Boxes,
  ChartNoAxesCombined,
  ChartColumn,
  ClipboardList,
  ClipboardPlus,
  History,
  PackageSearch,
  Plus,
  ShoppingBag,
  ShoppingCart,
  ReceiptText,
  Tags,
  TrendingUp,
  UserPlus,
  Users,
} from 'lucide-react';
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
              <Link href="/products" className="workspace-action">
                <PackageSearch className="size-4" aria-hidden />
                Consultar produtos
              </Link>
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
            <div className="workspace-actions">
              <Link href="/inventory" className="workspace-action">
                <PackageSearch className="size-4" aria-hidden />
                Consultar saldos
              </Link>
              <Link href="/inventory/movements" className="workspace-action">
                <History className="size-4" aria-hidden />
                Ver movimentações
              </Link>
              <Link
                href="/inventory/adjustments/new"
                className="workspace-action"
              >
                <Plus className="size-4" aria-hidden />
                Registrar ajuste
              </Link>
            </div>
          </div>
          <div className="workspace-row">
            <ShoppingBag aria-hidden />
            <div>
              <h2>Pedidos e vendas</h2>
              <p>Compras, clientes e vendas da operação.</p>
            </div>
            <div className="workspace-actions">
              <Link href="/customers" className="workspace-action">
                <Users className="size-4" aria-hidden />
                Consultar clientes
              </Link>
              <Link href="/orders" className="workspace-action">
                <ClipboardList className="size-4" aria-hidden />
                Consultar pedidos
              </Link>
              <Link href="/orders/new" className="workspace-action">
                <ClipboardPlus className="size-4" aria-hidden />
                Criar pedido
              </Link>
              <Link href="/sales/new" className="workspace-action">
                <ShoppingCart className="size-4" aria-hidden />
                Registrar venda
              </Link>
              <Link href="/sales" className="workspace-action">
                <ReceiptText className="size-4" aria-hidden />
                Consultar vendas
              </Link>
              <Link href="/customers/new" className="workspace-action">
                <UserPlus className="size-4" aria-hidden />
                Cadastrar cliente
              </Link>
            </div>
          </div>
          <div className="workspace-row">
            <ChartNoAxesCombined aria-hidden />
            <div>
              <h2>Relatórios</h2>
              <p>Indicadores para acompanhamento da operação.</p>
            </div>
            <div className="workspace-actions">
              <Link href="/reports/inventory" className="workspace-action">
                <Boxes className="size-4" aria-hidden />
                Posição de estoque
              </Link>
              <Link href="/reports/sales" className="workspace-action">
                <ChartColumn className="size-4" aria-hidden />
                Vendas por período
              </Link>
              <Link href="/reports/margins" className="workspace-action">
                <TrendingUp className="size-4" aria-hidden />
                Margem por produto
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
