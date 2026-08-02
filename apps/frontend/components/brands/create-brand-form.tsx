'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, CircleCheck, LoaderCircle, Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const createBrandSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Informe o nome da marca.')
    .max(100, 'O nome deve ter no máximo 100 caracteres.'),
});

type CreateBrandFields = z.infer<typeof createBrandSchema>;

interface ApiErrorEnvelope {
  error?: {
    message?: string;
  };
}

interface CreateBrandResponse {
  data: {
    name: string;
  };
}

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export function CreateBrandForm(): React.JSX.Element {
  const [requestError, setRequestError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<CreateBrandFields>({
    resolver: zodResolver(createBrandSchema),
    defaultValues: { name: '' },
  });

  async function submit(fields: CreateBrandFields): Promise<void> {
    setRequestError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`${apiUrl}/api/v1/brands`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as ApiErrorEnvelope;
        setRequestError(
          body.error?.message ?? 'Não foi possível cadastrar a marca.',
        );
        return;
      }

      const body = (await response.json()) as CreateBrandResponse;
      reset();
      setSuccessMessage(`Marca ${body.data.name} cadastrada.`);
      setFocus('name');
    } catch {
      setRequestError('Não foi possível conectar ao servidor. Tente novamente.');
    }
  }

  return (
    <form
      className="mt-8 max-w-xl border-t border-border pt-7"
      onSubmit={handleSubmit(submit)}
      noValidate
    >
      <div className="space-y-2">
        <Label htmlFor="brand-name">Nome da marca</Label>
        <Input
          id="brand-name"
          autoComplete="organization"
          autoFocus
          maxLength={100}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? 'brand-name-error' : undefined}
          {...register('name')}
        />
        {errors.name ? (
          <p id="brand-name-error" className="text-sm text-destructive">
            {errors.name.message}
          </p>
        ) : null}
      </div>

      {requestError ? (
        <div
          role="alert"
          className="mt-5 flex items-start gap-2 border-l-2 border-destructive bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{requestError}</span>
        </div>
      ) : null}

      {successMessage ? (
        <div
          role="status"
          className="mt-5 flex items-start gap-2 border-l-2 border-ring bg-muted px-3 py-2.5 text-sm text-foreground"
        >
          <CircleCheck className="mt-0.5 size-4 shrink-0 text-ring" aria-hidden />
          <span>{successMessage}</span>
        </div>
      ) : null}

      <Button className="mt-6" type="submit" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <LoaderCircle className="size-4 animate-spin" aria-hidden />
            Cadastrando marca
          </>
        ) : (
          <>
            <Plus className="size-4" aria-hidden />
            Cadastrar marca
          </>
        )}
      </Button>
    </form>
  );
}
