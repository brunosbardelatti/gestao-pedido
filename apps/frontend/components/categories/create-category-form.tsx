'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertCircle,
  CircleCheck,
  LoaderCircle,
  Pencil,
  Plus,
} from 'lucide-react';
import Link from 'next/link';
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
    id: string;
    name: string;
  };
}

interface CreatedCategory {
  id: string;
  name: string;
}

const apiUrl = '';

export function CreateCategoryForm(): React.JSX.Element {
  const [requestError, setRequestError] = useState<string | null>(null);
  const [createdCategory, setCreatedCategory] =
    useState<CreatedCategory | null>(null);
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
    setCreatedCategory(null);

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
      setCreatedCategory({ id: body.data.id, name: body.data.name });
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

      {createdCategory ? (
        <div
          role="status"
          className="mt-5 flex items-start gap-2 border-l-2 border-ring bg-muted px-3 py-2.5 text-sm text-foreground"
        >
          <CircleCheck className="mt-0.5 size-4 shrink-0 text-ring" aria-hidden />
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2">
            <span>Categoria {createdCategory.name} cadastrada.</span>
            <Link
              href={`/categories/${createdCategory.id}/edit?name=${encodeURIComponent(createdCategory.name)}`}
              aria-label={`Editar ${createdCategory.name}`}
              className="inline-flex min-h-8 items-center gap-1.5 font-semibold text-ring hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Pencil className="size-3.5" aria-hidden />
              Editar
            </Link>
          </div>
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
