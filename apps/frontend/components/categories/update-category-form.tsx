'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, CircleCheck, LoaderCircle, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const updateCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Informe o nome da categoria.')
    .max(100, 'O nome deve ter no mÃ¡ximo 100 caracteres.'),
});

type UpdateCategoryFields = z.infer<typeof updateCategorySchema>;

interface UpdateCategoryFormProps {
  categoryId: string;
  initialName: string;
  initialActive?: boolean;
}

interface ApiErrorEnvelope {
  error?: {
    message?: string;
  };
}

interface UpdateCategoryResponse {
  data: {
    name: string;
  };
}

const apiUrl = '';

export function UpdateCategoryForm({
  categoryId,
  initialName,
  initialActive = true,
}: UpdateCategoryFormProps): React.JSX.Element {
  const router = useRouter();
  const [requestError, setRequestError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UpdateCategoryFields>({
    resolver: zodResolver(updateCategorySchema),
    defaultValues: { name: initialName },
  });

  async function submit(fields: UpdateCategoryFields): Promise<void> {
    setRequestError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`${apiUrl}/api/v1/categories/${categoryId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as ApiErrorEnvelope;
        setRequestError(
          body.error?.message ?? 'NÃ£o foi possÃ­vel atualizar a categoria.',
        );
        return;
      }

      const body = (await response.json()) as UpdateCategoryResponse;
      reset({ name: body.data.name });
      setSuccessMessage(`Categoria ${body.data.name} atualizada.`);
      router.replace(
        `/categories/${categoryId}/edit?name=${encodeURIComponent(body.data.name)}&active=${initialActive}`,
        { scroll: false },
      );
    } catch {
      setRequestError('NÃ£o foi possÃ­vel conectar ao servidor. Tente novamente.');
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
            Salvando alteraÃ§Ãµes
          </>
        ) : (
          <>
            <Save className="size-4" aria-hidden />
            Salvar alteraÃ§Ãµes
          </>
        )}
      </Button>
    </form>
  );
}

