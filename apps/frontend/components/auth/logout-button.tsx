'use client';

import { useState } from 'react';
import { AlertCircle, LoaderCircle, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export function LogoutButton(): React.JSX.Element {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  async function logout(): Promise<void> {
    setIsSubmitting(true);
    setRequestError(null);

    try {
      const response = await fetch(`${apiUrl}/api/v1/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok && response.status !== 401) {
        setRequestError('Não foi possível encerrar a sessão.');
        return;
      }

      router.replace('/login');
      router.refresh();
    } catch {
      setRequestError('Não foi possível encerrar a sessão.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const label = isSubmitting ? 'Saindo' : 'Sair';

  return (
    <div className="relative">
      <Button
        type="button"
        variant="ghost"
        className="h-10 px-2.5 text-muted-foreground sm:px-3"
        disabled={isSubmitting}
        onClick={logout}
        aria-label={label}
        title={label}
      >
        {isSubmitting ? (
          <LoaderCircle className="size-4 animate-spin" aria-hidden />
        ) : (
          <LogOut className="size-4" aria-hidden />
        )}
        <span className="hidden sm:inline">{label}</span>
      </Button>
      {requestError ? (
        <div
          role="alert"
          className="fixed right-4 top-20 z-50 flex w-[min(20rem,calc(100vw-2rem))] items-start gap-2 rounded-md border border-destructive/30 bg-background px-3 py-2.5 text-sm text-destructive shadow-lg"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{requestError}</span>
        </div>
      ) : null}
    </div>
  );
}
