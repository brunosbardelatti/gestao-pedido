'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
  Save,
  TriangleAlert,
} from 'lucide-react';
import Link from 'next/link';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import type { InventoryAdjustmentProduct } from '@/lib/inventory';

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const adjustmentSchema = z.object({
  productId: z
    .string()
    .min(1, 'Selecione o produto.')
    .regex(uuidPattern, 'Selecione um produto válido.'),
  type: z.enum(['CORRECTION', 'PERSONAL_USE', 'RETURN']),
  quantityDelta: z
    .number({ error: 'Informe a quantidade.' })
    .int('A quantidade deve ser inteira.')
    .refine((value) => value !== 0, 'A quantidade não pode ser zero.'),
  reason: z
    .string()
    .trim()
    .min(1, 'Informe o motivo.')
    .max(500, 'Use no máximo 500 caracteres.'),
  confirmNegativeStock: z.boolean(),
});

type AdjustmentFields = z.infer<typeof adjustmentSchema>;

interface AdjustStockFormProps {
  products: InventoryAdjustmentProduct[];
  referenceError?: string;
}

interface ApiErrorEnvelope {
  error?: { message?: string };
}

const apiUrl = '';

export function AdjustStockForm({
  products,
  referenceError,
}: AdjustStockFormProps): React.JSX.Element {
  const [requestError, setRequestError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [attempt, setAttempt] = useState<{
    payload: string;
    key: string;
  } | null>(null);
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AdjustmentFields>({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: {
      productId: '',
      type: 'CORRECTION',
      quantityDelta: 1,
      reason: '',
      confirmNegativeStock: false,
    },
  });
  const productId = useWatch({ control, name: 'productId' });
  const quantityDelta = useWatch({ control, name: 'quantityDelta' });
  const confirmNegativeStock = useWatch({
    control,
    name: 'confirmNegativeStock',
  });
  const selectedProduct = products.find((product) => product.id === productId);
  const projectedBalance =
    selectedProduct && Number.isFinite(quantityDelta)
      ? selectedProduct.balance + quantityDelta
      : null;
  const requiresConfirmation =
    projectedBalance !== null && projectedBalance < 0;

  async function submit(fields: AdjustmentFields): Promise<void> {
    setRequestError(null);
    setSuccess(null);

    const body = {
      productId: fields.productId,
      type: fields.type,
      quantityDelta: fields.quantityDelta,
      reason: fields.reason.trim(),
      confirmNegativeStock: fields.confirmNegativeStock,
    };
    const payload = JSON.stringify(body);
    const key = attempt?.payload === payload ? attempt.key : crypto.randomUUID();
    setAttempt({ payload, key });

    try {
      const response = await fetch(`${apiUrl}/api/v1/inventory/adjustments`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': key,
        },
        body: payload,
      });
      if (!response.ok) {
        const error = (await response.json()) as ApiErrorEnvelope;
        setRequestError(
          error.error?.message ?? 'Não foi possível registrar o ajuste.',
        );
        return;
      }

      const sign = fields.quantityDelta > 0 ? '+' : '';
      setSuccess(
        `Ajuste de ${sign}${fields.quantityDelta} unidades registrado para ${selectedProduct?.code ?? 'o produto'}.`,
      );
      setAttempt(null);
      reset({
        productId: '',
        type: 'CORRECTION',
        quantityDelta: 1,
        reason: '',
        confirmNegativeStock: false,
      });
    } catch {
      setRequestError('Não foi possível conectar ao serviço de estoque.');
    }
  }

  const catalogAvailable = products.length > 0;

  return (
    <form className="space-y-6" onSubmit={handleSubmit(submit)} noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="adjustment-product">Produto</Label>
          <NativeSelect
            id="adjustment-product"
            disabled={!catalogAvailable || isSubmitting}
            aria-invalid={Boolean(errors.productId)}
            {...register('productId')}
          >
            <option value="">Selecione</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.code} · {product.description}
              </option>
            ))}
          </NativeSelect>
          {errors.productId ? (
            <p className="text-sm text-destructive">{errors.productId.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="adjustment-type">Tipo de ajuste</Label>
          <NativeSelect
            id="adjustment-type"
            disabled={isSubmitting}
            {...register('type')}
          >
            <option value="CORRECTION">Correção</option>
            <option value="PERSONAL_USE">Uso pessoal</option>
            <option value="RETURN">Devolução</option>
          </NativeSelect>
        </div>

        <div className="space-y-2">
          <Label htmlFor="adjustment-quantity">Quantidade</Label>
          <Input
            id="adjustment-quantity"
            type="number"
            step="1"
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.quantityDelta)}
            {...register('quantityDelta', { valueAsNumber: true })}
          />
          {errors.quantityDelta ? (
            <p className="text-sm text-destructive">
              {errors.quantityDelta.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="adjustment-reason">Motivo</Label>
          <Textarea
            id="adjustment-reason"
            maxLength={500}
            placeholder="Descreva por que o saldo precisa ser ajustado"
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.reason)}
            {...register('reason')}
          />
          {errors.reason ? (
            <p className="text-sm text-destructive">{errors.reason.message}</p>
          ) : null}
        </div>
      </div>

      {selectedProduct ? (
        <div className="grid gap-3 border-y border-border py-4 text-sm sm:grid-cols-2">
          <p>
            <span className="text-muted-foreground">Saldo atual:</span>{' '}
            <strong>{selectedProduct.balance} unidades</strong>
          </p>
          {projectedBalance !== null ? (
            <p>
              <span className="text-muted-foreground">Saldo projetado:</span>{' '}
              <strong className={projectedBalance < 0 ? 'text-destructive' : ''}>
                {projectedBalance} unidades
              </strong>
            </p>
          ) : null}
        </div>
      ) : null}

      {requiresConfirmation ? (
        <div className="border-l-2 border-destructive bg-destructive/5 px-4 py-3 text-sm">
          <p className="flex items-center gap-2 font-semibold text-destructive">
            <TriangleAlert className="size-4" aria-hidden />
            Este ajuste deixará o estoque negativo.
          </p>
          <label className="mt-3 flex cursor-pointer items-start gap-2 font-medium">
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-[var(--destructive)]"
              disabled={isSubmitting}
              {...register('confirmNegativeStock')}
            />
            Confirmo o saldo negativo
          </label>
        </div>
      ) : null}

      {referenceError ? (
        <div role="alert" className="flex items-start gap-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{referenceError}</span>
        </div>
      ) : null}
      {requestError ? (
        <div role="alert" className="flex items-start gap-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{requestError}</span>
        </div>
      ) : null}
      {success ? (
        <div role="status" className="flex items-start gap-2 text-sm text-ring">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{success}</span>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button
          type="submit"
          disabled={
            isSubmitting ||
            !catalogAvailable ||
            (requiresConfirmation && !confirmNegativeStock)
          }
        >
          {isSubmitting ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden />
          ) : (
            <Save className="size-4" aria-hidden />
          )}
          {isSubmitting ? 'Registrando' : 'Registrar ajuste'}
        </Button>
        <Link
          href="/inventory/movements"
          className={buttonVariants({ variant: 'ghost' })}
        >
          Ver movimentações
        </Link>
      </div>
    </form>
  );
}
