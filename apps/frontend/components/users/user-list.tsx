import { Pencil } from 'lucide-react';
import Link from 'next/link';

import type { UserSummary } from '@/lib/users';

interface UserListProps {
  users: UserSummary[];
}

export function UserList({ users }: UserListProps): React.JSX.Element {
  if (users.length === 0) {
    return (
      <p className="mt-8 text-sm text-muted-foreground">Nenhum usuário cadastrado.</p>
    );
  }

  return (
    <div className="mt-6 divide-y divide-border border-y border-border">
      {users.map((user) => (
        <div
          key={user.id}
          className="flex items-center justify-between gap-4 py-4"
        >
          <div className="min-w-0">
            <p className="truncate font-medium">{user.name}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {user.login} &middot;{' '}
              {user.role === 'ADMIN' ? 'Administrador' : 'Operador'}
              {!user.active ? (
                <span className="ml-2 text-xs text-destructive">inativo</span>
              ) : null}
            </p>
          </div>
          <Link
            href={`/users/${user.id}/edit`}
            className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Pencil className="size-3.5" aria-hidden />
            Editar
          </Link>
        </div>
      ))}
    </div>
  );
}
