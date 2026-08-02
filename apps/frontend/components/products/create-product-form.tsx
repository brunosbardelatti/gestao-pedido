'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, CircleCheck, LoaderCircle, Plus } from 'lucide-react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import type { CatalogOption } from '@/lib/catalog';

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const moneyPattern = /^\d{1,10}(?:[.,]\d{1,2})?$/;

const createProductSchema = z.object({
  brandId: z
    .string()
    .min(1, 'Selecione a marca.')
    .regex(uuidPattern, 'Selecione uma marca válida.'),
  categoryId: z
    .string()
    .min(1, 'Selecione a categoria.')
    .regex(uuidPattern, 'Selecione uma categoria válida.'),
  code: z
    .string()
    .trim()
    .min(1, 'Informe o código do produto.')
    .max(80, 'O código deve ter no máximo 80 caracteres.'),
  description: z
    .string()
    .trim()
    .min(1, 'Informe a descrição.')
    .max(255, 'A descrição deve ter no máximo 255 caracteres.'),
  catalogPrice: z
    .string()
    .trim()
    .regex(moneyPattern, 'Informe um preço de catálogo válido.'),
  purchasePrice: z
    .string()
    .trim()
    .regex(moneyPattern, 'Informe um preço de compra válido.'),
  originalPrice: z
    .string()
    .trim()
    .regex(moneyPattern, 'Informe um preço original válido.'),
  suggestedSalePrice: z
    .string()
    .trim()
    .refine(
      (value) => value.length === 0 || moneyPattern.test(value),
      'Informe um preço sugerido válido.',
    ),
});

type CreateProductFields = z.infer<typeof createProductSchema>;

interface CreateProductFormProps {
  brands: CatalogOption[];
  categories: CatalogOption[];
  referenceError?: string;
}

interface ApiErrorEnvelope {
  error?: {
    message?: string;
  };
}

interface CreateProductResponse {
  data: {
    code: string;
  };
}

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function normalizeMoney(input: string): string {
  const [rawInteger = '0', rawFraction = ''] = input.replace(',', '.').split('.');
  const integer = rawInteger.replace(/^0+(?=\d)/, '');

  return `${integer}.${rawFraction.padEnd(2, '0')}`;
}

export function CreateProductForm({
  brands,
  categories,
  referenceError,
}: CreateProductFormProps): React.JSX.Element {
  const [requestError, setRequestError] = useState<string | null>(null);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const referencesAvailable = brands.length > 0 && categories.length > 0;
  const {
    register,
    handleSubmit,
    reset,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<CreateProductFields>({
    resolver: zodResolver(createProductSchema),
    defaultValues: {
      brandId: '',
      categoryId: '',
      code: '',
      description: '',
      catalogPrice: '',
      purchasePrice: '',
      originalPrice: '',
      suggestedSalePrice: '',
    },
  });

  async function submit(fields: CreateProductFields): Promise<void> {
    setRequestError(null);
    setCreatedCode(null);

    const payload = {
      brandId: fields.brandId,
      categoryId: fields.categoryId,
      code: fields.code,
      description: fields.description,
      catalogPrice: normalizeMoney(fields.catalogPrice),
      purchasePrice: normalizeMoney(fields.purchasePrice),
      originalPrice: normalizeMoney(fields.originalPrice),
      ...(fields.suggestedSalePrice
        ? { suggestedSalePrice: normalizeMoney(fields.suggestedSalePrice) }
        : {}),
    };

    try {
      const response = await fetch(`${apiUrl}/api/v1/products`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as ApiErrorEnvelope;
        setRequestError(
          body.error?.message ?? 'Não foi possível cadastrar o produto.',
        );
        return;
      }

      const body = (await response.json()) as CreateProductResponse;
      reset({
        brandId: fields.brandId,
        categoryId: fields.categoryId,
        code: '',
        description: '',
        catalogPrice: '',
        purchasePrice: '',
        originalPrice: '',
        suggestedSalePrice: '',
      });
      setCreatedCode(body.data.code);
      setFocus('code');
    } catch {
      setRequestError('Não foi possível conectar ao servidor. Tente novamente.');
    }
  }

  return (
    <form
      className="mt-8 max-w-3xl border-t border-border pt-7"
      onSubmit={handleSubmit(submit)}
      noValidate
    >
      {referenceError ? (
        <div
          role="alert"
          className="mb-6 flex items-start gap-2 border-l-2 border-destructive bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{referenceError}</span>
        </div>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="product-brand">Marca</Label>
          <NativeSelect
            id="product-brand"
            disabled={brands.length === 0}
            aria-invalid={Boolean(errors.brandId)}
            aria-describedby={errors.brandId ? 'product-brand-error' : undefined}
            {...register('brandId')}
          >
            <option value="">Selecione</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </NativeSelect>
          {brands.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma marca ativa disponível.{' '}
              <Link className="font-semibold text-ring hover:underline" href="/brands/new">
                Cadastrar marca
              </Link>
            </p>
          ) : null}
          {errors.brandId ? (
            <p id="product-brand-error" className="text-sm text-destructive">
              {errors.brandId.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="product-category">Categoria</Label>
          <NativeSelect
            id="product-category"
            disabled={categories.length === 0}
            aria-invalid={Boolean(errors.categoryId)}
            aria-describedby={
              errors.categoryId ? 'product-category-error' : undefined
            }
            {...register('categoryId')}
          >
            <option value="">Selecione</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </NativeSelect>
          {categories.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma categoria ativa disponível.{' '}
              <Link
                className="font-semibold text-ring hover:underline"
                href="/categories/new"
              >
                Cadastrar categoria
              </Link>
            </p>
          ) : null}
          {errors.categoryId ? (
            <p id="product-category-error" className="text-sm text-destructive">
              {errors.categoryId.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="product-code">Código do produto</Label>
          <Input
            id="product-code"
            autoFocus
            maxLength={80}
            aria-invalid={Boolean(errors.code)}
            aria-describedby={errors.code ? 'product-code-error' : undefined}
            {...register('code')}
          />
          {errors.code ? (
            <p id="product-code-error" className="text-sm text-destructive">
              {errors.code.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="product-description">Descrição</Label>
          <Input
            id="product-description"
            maxLength={255}
            aria-invalid={Boolean(errors.description)}
            aria-describedby={
              errors.description ? 'product-description-error' : undefined
            }
            {...register('description')}
          />
          {errors.description ? (
            <p
              id="product-description-error"
              className="text-sm text-destructive"
            >
              {errors.description.message}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-7 border-t border-border pt-6">
        <p className="text-sm font-semibold">Valores atuais</p>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          {[
            ['catalogPrice', 'Preço de catálogo'],
            ['purchasePrice', 'Preço de compra'],
            ['originalPrice', 'Preço original'],
            ['suggestedSalePrice', 'Preço sugerido de venda (opcional)'],
          ].map(([field, label]) => {
            const name = field as keyof Pick<
              CreateProductFields,
              | 'catalogPrice'
              | 'purchasePrice'
              | 'originalPrice'
              | 'suggestedSalePrice'
            >;
            const error = errors[name];

            return (
              <div className="space-y-2" key={name}>
                <Label htmlFor={`product-${name}`}>{label}</Label>
                <Input
                  id={`product-${name}`}
                  inputMode="decimal"
                  maxLength={13}
                  placeholder="0,00"
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? `product-${name}-error` : undefined}
                  {...register(name)}
                />
                {error ? (
                  <p
                    id={`product-${name}-error`}
                    className="text-sm text-destructive"
                  >
                    {error.message}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
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

      {createdCode ? (
        <div
          role="status"
          className="mt-5 flex items-start gap-2 border-l-2 border-ring bg-muted px-3 py-2.5 text-sm text-foreground"
        >
          <CircleCheck className="mt-0.5 size-4 shrink-0 text-ring" aria-hidden />
          <span>Produto {createdCode} cadastrado.</span>
        </div>
      ) : null}

      <Button
        className="mt-6"
        type="submit"
        disabled={isSubmitting || !referencesAvailable}
      >
        {isSubmitting ? (
          <>
            <LoaderCircle className="size-4 animate-spin" aria-hidden />
            Cadastrando produto
          </>
        ) : (
          <>
            <Plus className="size-4" aria-hidden />
            Cadastrar produto
          </>
        )}
      </Button>
    </form>
  );
}
