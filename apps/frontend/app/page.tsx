import { Boxes, PackageCheck, ShoppingBag } from 'lucide-react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { LogoutButton } from '@/components/auth/logout-button';

interface CurrentUser {
  id: string;
  name: string;
  login: string;
  role: 'ADMIN' | 'OPERATOR';
  active: boolean;
}

async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

  try {
    const response = await fetch(`${apiUrl}/api/v1/auth/me`, {
      headers: { Cookie: cookieStore.toString() },
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    const body = (await response.json()) as { data: CurrentUser };
    return body.data;
  } catch {
    return null;
  }
}

export default async function HomePage(): Promise<React.JSX.Element> {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <main className="min-h-svh bg-background text-foreground">
      <header className="flex h-16 items-center border-b border-border px-5 sm:px-8">
        <div className="brand-mark">
          <span className="brand-icon" aria-hidden>
            <PackageCheck className="size-5" strokeWidth={1.8} />
          </span>
          <span>Gestão de Pedidos</span>
        </div>
        <div className="ml-auto flex items-center gap-2 sm:gap-4">
          <div className="text-right">
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-xs text-muted-foreground">
              {user.role === 'ADMIN' ? 'Administrador' : 'Operador'}
            </p>
          </div>
          <LogoutButton />
        </div>
      </header>
      <section className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <p className="section-kicker">Visão geral</p>
        <h1 className="mt-2 text-2xl font-semibold">Operação</h1>
        <div className="mt-8 divide-y divide-border border-y border-border">
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
