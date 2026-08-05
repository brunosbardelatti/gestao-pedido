'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, CheckCircle2, LoaderCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const schema = z.object({
  newPassword: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres.').max(128),
});

type Fields = z.infer<typeof schema>;

interface ApiErrorEnvelope {
  error?: { message?: string };
}

interface ResetPasswordSectionProps {
  userId: string;
  userName: string;
}

export function ResetPasswordSection({ userId, userName }: ResetPasswordSectionProps): React.JSX.Element {
  const [success, setSuccess] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Fields>({ resolver: zodResolver(schema) });

  async function submit(fields: Fields): Promise<void> {
    setRequestError(null);
    setSuccess(false);

    try {
      const response = await fetch(`/api/v1/users/${userId}/reset-password`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: fields.newPassword }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as ApiErrorEnvelope;
        setRequestError(body.error?.message ?? 'Não foi possível redefinir a senha.');
        return;
      }

      reset();
      setSuccess(true);
    } catch {
      setRequestError('Não foi possível conectar ao servidor. Tente novamente.');
    }
  }

  return (
    <div className="mt-10 border-t border-border pt-8">
      <h2 className="text-lg font-semibold">Redefinir senha</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Define uma nova senha para {userName}. O usuário deverá trocar na próxima entrada.
      </p>
      <form className="mt-5 max-w-sm space-y-5" onSubmit={handleSubmit(submit)} noValidate>
        <div className="space-y-2">
          <Label htmlFor="newPassword">Nova senha</Label>
          <Input
            id="newPassword"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.newPassword)}
            {...register('newPassword')}
          />
          {errors.newPassword ? (
            <p role="alert" className="text-sm text-destructive">{errors.newPassword.message}</p>
          ) : null}
        </div>

        {requestError ? (
          <div
            role="alert"
            className="flex items-start gap-2 border-l-2 border-destructive bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>{requestError}</span>
          </div>
        ) : null}

        {success ? (
          <div
            role="status"
            className="flex items-center gap-2 border-l-2 border-ring bg-ring/10 px-3 py-2.5 text-sm text-foreground"
          >
            <CheckCircle2 className="size-4 shrink-0" aria-hidden />
            <span>Senha redefinida com sucesso.</span>
          </div>
        ) : null}

        <Button type="submit" variant="ghost" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <LoaderCircle className="size-4 animate-spin" aria-hidden />
              Redefinindo
            </>
          ) : (
            'Redefinir senha'
          )}
        </Button>
      </form>
    </div>
  );
}
