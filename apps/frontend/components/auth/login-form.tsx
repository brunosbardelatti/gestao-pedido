'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Eye, EyeOff, LoaderCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const loginSchema = z.object({
  login: z.string().trim().min(1, 'Informe o login.').max(80),
  password: z
    .string()
    .min(8, 'A senha deve ter pelo menos 8 caracteres.')
    .max(128),
});

type LoginFields = z.infer<typeof loginSchema>;

interface ApiErrorEnvelope {
  error?: {
    message?: string;
  };
}

export function LoginForm(): React.JSX.Element {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFields>({
    resolver: zodResolver(loginSchema),
    defaultValues: { login: '', password: '' },
  });

  async function submit(fields: LoginFields): Promise<void> {
    setRequestError(null);

    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as ApiErrorEnvelope;
        setRequestError(
          body.error?.message ?? 'Não foi possível entrar. Tente novamente.',
        );
        return;
      }

      router.replace('/');
    } catch {
      setRequestError('Não foi possível conectar ao servidor. Tente novamente.');
    }
  }

  return (
    <form className="mt-8 space-y-5" onSubmit={handleSubmit(submit)} noValidate>
      <div className="space-y-2">
        <Label htmlFor="login">Login</Label>
        <Input
          id="login"
          autoComplete="username"
          autoFocus
          aria-invalid={Boolean(errors.login)}
          aria-describedby={errors.login ? 'login-error' : undefined}
          {...register('login')}
        />
        {errors.login ? (
          <p id="login-error" className="text-sm text-destructive">
            {errors.login.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            className="pr-12"
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? 'password-error' : undefined}
            {...register('password')}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0.5 top-0.5 text-muted-foreground"
            onClick={() => setShowPassword((current) => !current)}
            aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
          >
            {showPassword ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
          </Button>
        </div>
        {errors.password ? (
          <p id="password-error" className="text-sm text-destructive">
            {errors.password.message}
          </p>
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

      <Button className="w-full" type="submit" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <LoaderCircle className="size-4 animate-spin" aria-hidden />
            Entrando
          </>
        ) : (
          'Entrar'
        )}
      </Button>
    </form>
  );
}
