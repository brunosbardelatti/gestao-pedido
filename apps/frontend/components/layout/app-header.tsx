import { PackageCheck } from 'lucide-react';
import Link from 'next/link';

import { LogoutButton } from '@/components/auth/logout-button';
import type { CurrentUser } from '@/lib/auth';

interface AppHeaderProps {
  user: CurrentUser;
}

export function AppHeader({ user }: AppHeaderProps): React.JSX.Element {
  return (
    <header className="border-b border-border">
      <nav aria-label="Principal" className="flex h-16 w-full items-center px-5 sm:px-8">
        <Link href="/" className="brand-mark">
          <span className="brand-icon" aria-hidden>
            <PackageCheck className="size-5" strokeWidth={1.8} />
          </span>
          <span>Gestão de Pedidos</span>
        </Link>
        <div className="ml-auto flex items-center gap-2 sm:gap-4">
          <Link
            href="/profile"
            className="hidden text-right min-[480px]:block hover:opacity-75 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
          >
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-xs text-muted-foreground">
              {user.role === 'ADMIN' ? 'Administrador' : 'Operador'}
            </p>
          </Link>
          <LogoutButton />
        </div>
      </nav>
    </header>
  );
}
