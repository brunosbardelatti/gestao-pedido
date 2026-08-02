import { PackageCheck } from 'lucide-react';
import Link from 'next/link';

import { LogoutButton } from '@/components/auth/logout-button';
import type { CurrentUser } from '@/lib/auth';

interface AppHeaderProps {
  user: CurrentUser;
}

export function AppHeader({ user }: AppHeaderProps): React.JSX.Element {
  return (
    <header className="flex h-16 items-center border-b border-border px-5 sm:px-8">
      <Link href="/" className="brand-mark">
        <span className="brand-icon" aria-hidden>
          <PackageCheck className="size-5" strokeWidth={1.8} />
        </span>
        <span>Gestão de Pedidos</span>
      </Link>
      <div className="ml-auto flex items-center gap-2 sm:gap-4">
        <div className="hidden text-right min-[480px]:block">
          <p className="text-sm font-medium">{user.name}</p>
          <p className="text-xs text-muted-foreground">
            {user.role === 'ADMIN' ? 'Administrador' : 'Operador'}
          </p>
        </div>
        <LogoutButton />
      </div>
    </header>
  );
}
