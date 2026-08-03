'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertCircle,
  CircleCheck,
  LoaderCircle,
  Plus,
  Save,
} from 'lucide-react';
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

const productSchema = z.object({
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

type ProductFields = z.infer<typeof productSchema>;

export type ProductFormInitialValues = ProductFields;

interface ProductFormProps {
  intent: 'create' | 'update';
  productId?: string;
  brands: CatalogOption[];
  categories: CatalogOption[];
  initialValues?: ProductFormInitialValues;
  referenceError?: string;
  onUpdated?: () => void;
}

interface ApiErrorEnvelope {
  error?: {
    message?: string;
  };
}

interface ProductResponse {
  data: {
    id?: string;
    code: string;
  };
}

const apiUrl = '';
const emptyValues: ProductFields = {
  brandId: '',
  categoryId: '',
  code: '',
  description: '',
  catalogPrice: '',
  purchasePrice: '',
  originalPrice: '',
  suggestedSalePrice: '',
};

function normalizeMoney(input: string): string {
  const [rawInteger = '0', rawFraction = ''] = input.replace(',', '.').split('.');
  const integer = rawInteger.replace(/^0+(?=\d)/, '');

  return `${integer}.${rawFraction.padEnd(2, '0')}`;
}

export function ProductForm({
  intent,
  productId,
  brands,
  categories,
  initialValues,
  referenceError,
  onUpdated,
}: ProductFormProps): React.JSX.Element {
  const isUpdate = intent === 'update';
  const [requestError, setRequestError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ id?: string; code: string } | null>(
    null,
  );
  const referencesAvailable = brands.length > 0 && categories.length > 0;
  const {
    register,
    handleSubmit,
    reset,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<ProductFields>({
    resolver: zodResolver(productSchema),
    defaultValues: initialValues ?? emptyValues,
  });

  async function submit(fields: ProductFields): Promise<void> {
    setRequestError(null);
    setSuccess(null);

    const suggestedSalePrice = fields.suggestedSalePrice
      ? normalizeMoney(fields.suggestedSalePrice)
      : null;
    const payload = {
      brandId: fields.brandId,
      categoryId: fields.categoryId,
      code: fields.code,
      description: fields.description,
      catalogPrice: normalizeMoney(fields.catalogPrice),
      purchasePrice: normalizeMoney(fields.purchasePrice),
      originalPrice: normalizeMoney(fields.originalPrice),
      ...(isUpdate
        ? { suggestedSalePrice }
        : suggestedSalePrice
          ? { suggestedSalePrice }
          : {}),
    };

    try {
      const response = await fetch(
        isUpdate
          ? `${apiUrl}/api/v1/products/${productId}`
          : `${apiUrl}/api/v1/products`,
        {
          method: isUpdate ? 'PUT' : 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as ApiErrorEnvelope;
        setRequestError(
          body.error?.message ??
            (isUpdate
              ? 'Não foi possível atualizar o produto.'
              : 'Não foi possível cadastrar o produto.'),
        );
        return;
      }

      const body = (await response.json()) as ProductResponse;
      if (isUpdate) {
        reset({
          ...fields,
          code: fields.code.trim(),
          description: fields.description.trim(),
          catalogPrice: payload.catalogPrice,
          purchasePrice: payload.purchasePrice,
          originalPrice: payload.originalPrice,
          suggestedSalePrice: suggestedSalePrice ?? '',
        });
      } else {
        reset({
          ...emptyValues,
          brandId: fields.brandId,
          categoryId: fields.categoryId,
        });
        setFocus('code');
      }
      setSuccess({ id: body.data.id, code: body.data.code });
      if (isUpdate) onUpdated?.();
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
            <p id="product-description-error" className="text-sm text-destructive">
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
              ProductFields,
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

      {success ? (
        <div
          role="status"
          className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 border-l-2 border-ring bg-muted px-3 py-2.5 text-sm text-foreground"
        >
          <CircleCheck className="size-4 shrink-0 text-ring" aria-hidden />
          <span>
            Produto {success.code} {isUpdate ? 'atualizado' : 'cadastrado'}.
          </span>
          {!isUpdate && success.id ? (
            <Link
              href={`/products/${success.id}/edit`}
              className="font-semibold text-ring hover:underline"
            >
              Editar produto
            </Link>
          ) : null}
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
            {isUpdate ? 'Salvando alterações' : 'Cadastrando produto'}
          </>
        ) : isUpdate ? (
          <>
            <Save className="size-4" aria-hidden />
            Salvar alterações
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
