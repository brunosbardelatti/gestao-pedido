'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, CircleCheck, LoaderCircle, Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const createCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Informe o nome da categoria.')
    .max(100, 'O nome deve ter no máximo 100 caracteres.'),
});

type CreateCategoryFields = z.infer<typeof createCategorySchema>;

interface ApiErrorEnvelope {
  error?: {
    message?: string;
  };
}

interface CreateCategoryResponse {
  data: {
    name: string;
  };
}

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export function CreateCategoryForm(): React.JSX.Element {
  const [requestError, setRequestError] = useState<string | null>(null);
  const [createdCategoryName, setCreatedCategoryName] = useState<string | null>(
    null,
  );
  const {
    register,
    handleSubmit,
    reset,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<CreateCategoryFields>({
    resolver: zodResolver(createCategorySchema),
    defaultValues: { name: '' },
  });

  async function submit(fields: CreateCategoryFields): Promise<void> {
    setRequestError(null);
    setCreatedCategoryName(null);

    try {
      const response = await fetch(`${apiUrl}/api/v1/categories`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as ApiErrorEnvelope;
        setRequestError(
          body.error?.message ?? 'Não foi possível cadastrar a categoria.',
        );
        return;
      }

      const body = (await response.json()) as CreateCategoryResponse;
      reset();
      setCreatedCategoryName(body.data.name);
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
        <Label htmlFor="category-name">Nome da categoria</Label>
        <Input
          id="category-name"
          autoComplete="off"
          autoFocus
          maxLength={100}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? 'category-name-error' : undefined}
          {...register('name')}
        />
        {errors.name ? (
          <p id="category-name-error" className="text-sm text-destructive">
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

      {createdCategoryName ? (
        <div
          role="status"
          className="mt-5 flex items-start gap-2 border-l-2 border-ring bg-muted px-3 py-2.5 text-sm text-foreground"
        >
          <CircleCheck className="mt-0.5 size-4 shrink-0 text-ring" aria-hidden />
          <span>Categoria {createdCategoryName} cadastrada.</span>
        </div>
      ) : null}

      <Button className="mt-6" type="submit" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <LoaderCircle className="size-4 animate-spin" aria-hidden />
            Cadastrando categoria
          </>
        ) : (
          <>
            <Plus className="size-4" aria-hidden />
            Cadastrar categoria
          </>
        )}
      </Button>
    </form>
  );
}
