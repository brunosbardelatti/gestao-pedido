'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertTriangle,
  CheckCircle2,
  LoaderCircle,
  Plus,
  ShoppingCart,
  Trash2,
} from 'lucide-react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import type {
  SaleCustomerReference,
  SaleProductReference,
} from '@/lib/sales';
import { CancelSaleSection } from './cancel-sale-section';
import { DownloadSaleReceiptButton } from './download-sale-receipt-button';

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const moneyPattern = /^\d{1,10}(?:[.,]\d{1,2})?$/;

const saleSchema = z
  .object({
    customerId: z.string(),
    paymentMethod: z.string(),
    notes: z.string().trim(),
    confirmNegativeStock: z.boolean(),
    items: z
      .array(
        z.object({
          productId: z
            .string()
            .min(1, 'Selecione o produto.')
            .regex(uuidPattern, 'Selecione um produto válido.'),
          quantity: z
            .number({ error: 'Informe a quantidade.' })
            .int('A quantidade deve ser inteira.')
            .min(1, 'A quantidade deve ser maior que zero.'),
          unitPrice: z
            .string()
            .trim()
            .regex(moneyPattern, 'Informe um preço válido.')
            .refine(
              (v) => parseFloat(v.replace(',', '.')) > 0,
              'O preço deve ser maior que zero.',
            ),
        }),
      )
      .min(1, 'Adicione ao menos um item.'),
  })
  .superRefine((sale, context) => {
    const products = new Set<string>();
    sale.items.forEach((item, index) => {
      if (item.productId && products.has(item.productId)) {
        context.addIssue({
          code: 'custom',
          message: 'Cada produto pode aparecer apenas uma vez.',
          path: ['items', index, 'productId'],
        });
      }
      products.add(item.productId);
    });
  });

type SaleFields = z.infer<typeof saleSchema>;

interface CreateSaleFormProps {
  products: SaleProductReference[];
  customers: SaleCustomerReference[];
  referenceError?: string;
}

interface ApiErrorEnvelope {
  error?: { message?: string };
}

interface SaleResponse {
  data: { id: string; total: string };
}

const apiUrl = '';

function emptyItem(): SaleFields['items'][number] {
  return { productId: '', quantity: 1, unitPrice: '' };
}

function initialValues(): SaleFields {
  return {
    customerId: '',
    paymentMethod: '',
    notes: '',
    confirmNegativeStock: false,
    items: [emptyItem()],
  };
}

function normalizeMoney(value: string): string {
  const [integer = '0', fraction = ''] = value.replace(',', '.').split('.');
  return `${integer.replace(/^0+(?=\d)/, '')}.${fraction.padEnd(2, '0')}`;
}

function moneyValue(value: string): number {
  const normalized = value.replace(',', '.');
  return moneyPattern.test(value) ? Number(normalized) : 0;
}

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

export function CreateSaleForm({
  products,
  customers,
  referenceError,
}: CreateSaleFormProps): React.JSX.Element {
  const [requestError, setRequestError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ id: string; total: string } | null>(null);
  const [attempt, setAttempt] = useState<{ payload: string; key: string } | null>(
    null,
  );
  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SaleFields>({
    resolver: zodResolver(saleSchema),
    defaultValues: initialValues(),
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const items = useWatch({ control, name: 'items' });
  const confirmNegativeStock = useWatch({
    control,
    name: 'confirmNegativeStock',
  });
  const shortages = (items ?? []).reduce((total, item) => {
    const product = products.find((candidate) => candidate.id === item.productId);
    if (!product || !Number.isFinite(item.quantity)) return total;
    return total + Math.max(0, item.quantity - product.balance);
  }, 0);
  const hasNegativeStock = shortages > 0;
  const total = (items ?? []).reduce(
    (sum, item) => sum + (Number.isFinite(item.quantity) ? item.quantity : 0) * moneyValue(item.unitPrice),
    0,
  );

  function selectProduct(index: number, productId: string): void {
    const product = products.find((item) => item.id === productId);
    setValue(`items.${index}.productId`, productId, { shouldValidate: true });
    setValue(`items.${index}.unitPrice`, product?.suggestedSalePrice ?? '', {
      shouldValidate: true,
    });
  }

  async function submit(fieldsValue: SaleFields): Promise<void> {
    setRequestError(null);
    setSuccess(null);
    const payload = {
      customerId: fieldsValue.customerId || null,
      paymentMethod: fieldsValue.paymentMethod || null,
      notes: fieldsValue.notes || null,
      confirmNegativeStock: hasNegativeStock
        ? fieldsValue.confirmNegativeStock
        : false,
      items: fieldsValue.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: normalizeMoney(item.unitPrice),
      })),
    };
    const serialized = JSON.stringify(payload);
    let currentAttempt = attempt;
    if (!currentAttempt || currentAttempt.payload !== serialized) {
      currentAttempt = { payload: serialized, key: crypto.randomUUID() };
      setAttempt(currentAttempt);
    }

    try {
      const response = await fetch(`${apiUrl}/api/v1/sales`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': currentAttempt.key,
        },
        body: serialized,
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as ApiErrorEnvelope;
        setRequestError(body.error?.message ?? 'Não foi possível registrar a venda.');
        return;
      }
      const body = (await response.json()) as SaleResponse;
      setAttempt(null);
      setSuccess({ id: body.data.id, total: body.data.total });
      reset(initialValues());
    } catch {
      setRequestError('Não foi possível conectar ao servidor. Tente novamente.');
    }
  }

  return (
    <form
      className="mt-8 max-w-5xl border-t border-border pt-7"
      onSubmit={handleSubmit(submit)}
      noValidate
    >
      {referenceError ? (
        <div role="alert" className="mb-6 border-l-2 border-destructive bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
          {referenceError}
        </div>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="sale-customer">Cliente</Label>
          <NativeSelect id="sale-customer" {...register('customerId')}>
            <option value="">Venda sem cliente</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>{customer.name}</option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="sale-payment">Forma de pagamento</Label>
          <NativeSelect id="sale-payment" {...register('paymentMethod')}>
            <option value="">Não informada</option>
            <option value="CASH">Dinheiro</option>
            <option value="PIX">Pix</option>
            <option value="DEBIT_CARD">Cartão de débito</option>
            <option value="CREDIT_CARD">Cartão de crédito</option>
            <option value="BANK_TRANSFER">Transferência</option>
            <option value="OTHER">Outra</option>
          </NativeSelect>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="sale-notes">Observações</Label>
          <Textarea id="sale-notes" rows={3} {...register('notes')} />
        </div>
      </div>

      <div className="mt-8 border-t border-border pt-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold">Itens da venda</p>
          <Button type="button" variant="ghost" onClick={() => append(emptyItem())}>
            <Plus className="size-4" aria-hidden />
            Adicionar item
          </Button>
        </div>
        <div className="mt-4 divide-y divide-border border-y border-border">
          {fields.map((field, index) => {
            const selected = products.find(
              (product) => product.id === items?.[index]?.productId,
            );
            const itemError = errors.items?.[index];
            return (
              <div key={field.id} className="py-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">Item {index + 1}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={fields.length === 1}
                    onClick={() => remove(index)}
                    aria-label={`Remover item ${index + 1}`}
                    title={`Remover item ${index + 1}`}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </div>
                <div className="mt-4 grid gap-5 sm:grid-cols-[minmax(0,2fr)_minmax(7rem,0.55fr)_minmax(9rem,0.8fr)]">
                  <div className="space-y-2">
                    <Label htmlFor={`sale-item-${index}-product`}>Produto</Label>
                    <NativeSelect
                      id={`sale-item-${index}-product`}
                      aria-label={`Produto do item ${index + 1}`}
                      value={items?.[index]?.productId ?? ''}
                      onChange={(event) => selectProduct(index, event.target.value)}
                    >
                      <option value="">Selecione</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.code} · {product.description}
                        </option>
                      ))}
                    </NativeSelect>
                    {itemError?.productId ? (
                      <p role="alert" className="text-sm text-destructive">{itemError.productId.message}</p>
                    ) : null}
                    {selected ? (
                      <p className="text-xs text-muted-foreground">
                        Saldo atual: {selected.balance}
                      </p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`sale-item-${index}-quantity`}>Quantidade</Label>
                    <Input
                      id={`sale-item-${index}-quantity`}
                      aria-label={`Quantidade do item ${index + 1}`}
                      type="number"
                      min={1}
                      step={1}
                      {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                    />
                    {itemError?.quantity ? (
                      <p role="alert" className="text-sm text-destructive">{itemError.quantity.message}</p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`sale-item-${index}-price`}>Preço unitário</Label>
                    <Input
                      id={`sale-item-${index}-price`}
                      aria-label={`Preço unitário do item ${index + 1}`}
                      inputMode="decimal"
                      {...register(`items.${index}.unitPrice`)}
                    />
                    {itemError?.unitPrice ? (
                      <p role="alert" className="text-sm text-destructive">{itemError.unitPrice.message}</p>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-4 border-b border-border pb-5">
        <span className="text-sm font-semibold">Total da venda</span>
        <strong className="text-lg">{currency.format(total)}</strong>
      </div>

      {hasNegativeStock ? (
        <div role="alert" className="mt-5 border-l-2 border-destructive bg-destructive/5 px-3 py-3 text-sm text-destructive">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              A venda deixará {shortages} {shortages === 1 ? 'unidade' : 'unidades'} abaixo de zero.
            </span>
          </div>
          <label className="mt-3 flex min-h-10 cursor-pointer items-center gap-2 text-foreground">
            <input type="checkbox" className="size-4 accent-[var(--ring)]" {...register('confirmNegativeStock')} />
            <span>Confirmo a venda mesmo com estoque negativo.</span>
          </label>
        </div>
      ) : null}

      {requestError ? (
        <div role="alert" className="mt-5 border-l-2 border-destructive bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
          {requestError}
        </div>
      ) : null}
      {success ? (
        <div role="status" className="mt-5 flex items-center gap-2 border-l-2 border-ring bg-muted px-3 py-2.5 text-sm">
          <CheckCircle2 className="size-4 text-ring" aria-hidden />
          Venda registrada no total de {currency.format(Number(success.total))}.
        </div>
      ) : null}

      <Button
        className="mt-6"
        type="submit"
        disabled={
          isSubmitting ||
          products.length === 0 ||
          (hasNegativeStock && !confirmNegativeStock)
        }
      >
        {isSubmitting ? (
          <><LoaderCircle className="size-4 animate-spin" aria-hidden />Registrando venda</>
        ) : (
          <><ShoppingCart className="size-4" aria-hidden />Registrar venda</>
        )}
      </Button>
      {success ? (
        <>
          <DownloadSaleReceiptButton saleId={success.id} />
          <CancelSaleSection saleId={success.id} total={success.total} />
        </>
      ) : null}
    </form>
  );
}
