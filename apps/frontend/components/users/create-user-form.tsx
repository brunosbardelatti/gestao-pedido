'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, CheckCircle2, LoaderCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const schema = z.object({
  name: z.string().trim().min(1, 'Informe o nome.').max(120),
  login: z.string().trim().min(1, 'Informe o login.').max(80),
  password: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres.').max(128),
  role: z.enum(['ADMIN', 'OPERATOR']),
});

type Fields = z.infer<typeof schema>;

interface ApiErrorEnvelope {
  error?: { message?: string };
}

export function CreateUserForm(): React.JSX.Element {
  const router = useRouter();
  const [requestError, setRequestError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Fields>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'OPERATOR' },
  });

  async function submit(fields: Fields): Promise<void> {
    setRequestError(null);

    try {
      const response = await fetch('/api/v1/users', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as ApiErrorEnvelope;
        setRequestError(body.error?.message ?? 'Não foi possível cadastrar o usuário.');
        return;
      }

      router.push('/users');
      router.refresh();
    } catch {
      setRequestError('Não foi possível conectar ao servidor. Tente novamente.');
    }
  }

  return (
    <form className="mt-8 space-y-5" onSubmit={handleSubmit(submit)} noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Nome</Label>
          <Input
            id="name"
            autoComplete="name"
            aria-invalid={Boolean(errors.name)}
            {...register('name')}
          />
          {errors.name ? (
            <p role="alert" className="text-sm text-destructive">{errors.name.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="login">Login</Label>
          <Input
            id="login"
            autoComplete="username"
            aria-invalid={Boolean(errors.login)}
            {...register('login')}
          />
          {errors.login ? (
            <p role="alert" className="text-sm text-destructive">{errors.login.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Senha inicial</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.password)}
            {...register('password')}
          />
          {errors.password ? (
            <p role="alert" className="text-sm text-destructive">{errors.password.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="role">Perfil</Label>
          <select
            id="role"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            {...register('role')}
          >
            <option value="OPERATOR">Operador</option>
            <option value="ADMIN">Administrador</option>
          </select>
          {errors.role ? (
            <p role="alert" className="text-sm text-destructive">{errors.role.message}</p>
          ) : null}
        </div>
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

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <LoaderCircle className="size-4 animate-spin" aria-hidden />
            Cadastrando
          </>
        ) : (
          'Cadastrar usuário'
        )}
      </Button>
    </form>
  );
}
