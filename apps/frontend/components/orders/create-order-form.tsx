'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertCircle,
  CircleCheck,
  ClipboardPlus,
  LoaderCircle,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import type { CatalogOption } from '@/lib/catalog';
import type { ProductDetails } from '@/lib/products';

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const moneyPattern = /^\d{1,10}(?:[.,]\d{1,2})?$/;

const orderItemSchema = z.object({
  productId: z
    .string()
    .min(1, 'Selecione o produto.')
    .regex(uuidPattern, 'Selecione um produto vÃ¡lido.'),
  quantityOrdered: z
    .number({ error: 'Informe a quantidade.' })
    .int('A quantidade deve ser inteira.')
    .min(1, 'A quantidade deve ser maior que zero.'),
  catalogUnitPrice: z
    .string()
    .trim()
    .regex(moneyPattern, 'Informe o preÃ§o de catÃ¡logo.'),
  purchaseUnitPrice: z
    .string()
    .trim()
    .regex(moneyPattern, 'Informe o preÃ§o de compra.'),
  originalUnitPrice: z
    .string()
    .trim()
    .regex(moneyPattern, 'Informe o preÃ§o original.'),
  notes: z.string().trim().max(500, 'Use no mÃ¡ximo 500 caracteres.'),
});

const createOrderSchema = z
  .object({
    brandId: z
      .string()
      .min(1, 'Selecione a marca.')
      .regex(uuidPattern, 'Selecione uma marca vÃ¡lida.'),
    cycle: z
      .string()
      .trim()
      .min(1, 'Informe o ciclo.')
      .max(80, 'O ciclo deve ter no mÃ¡ximo 80 caracteres.'),
    orderDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe a data do pedido.'),
    notes: z.string().trim(),
    items: z.array(orderItemSchema).min(1, 'Adicione ao menos um item.'),
  })
  .superRefine((order, context) => {
    const productIds = new Set<string>();
    order.items.forEach((item, index) => {
      if (item.productId && productIds.has(item.productId)) {
        context.addIssue({
          code: 'custom',
          message: 'Cada produto pode aparecer apenas uma vez.',
          path: ['items', index, 'productId'],
        });
      }
      productIds.add(item.productId);
    });
  });

type CreateOrderFields = z.infer<typeof createOrderSchema>;

export type OrderFormInitialValues = CreateOrderFields;

export interface HistoricalOrderProduct {
  id: string;
  brandId: string;
  code: string;
  description: string;
  catalogPrice: string;
  purchasePrice: string;
  originalPrice: string;
}

type OrderFormProduct = ProductDetails | HistoricalOrderProduct;

interface CreateOrderFormProps {
  brands: CatalogOption[];
  products: OrderFormProduct[];
  initialOrderDate: string;
  referenceError?: string;
}

export interface OrderFormProps {
  intent: 'create' | 'update';
  orderId?: string;
  brands: CatalogOption[];
  products: OrderFormProduct[];
  initialValues: OrderFormInitialValues;
  referenceError?: string;
  onUpdated?: () => void;
}

interface ApiErrorEnvelope {
  error?: {
    message?: string;
  };
}

interface CreateOrderResponse {
  data: {
    id: string;
    cycle: string;
  };
}

const apiUrl = '';

function emptyItem(): CreateOrderFields['items'][number] {
  return {
    productId: '',
    quantityOrdered: 1,
    catalogUnitPrice: '',
    purchaseUnitPrice: '',
    originalUnitPrice: '',
    notes: '',
  };
}

function normalizeMoney(input: string): string {
  const [rawInteger = '0', rawFraction = ''] = input.replace(',', '.').split('.');
  const integer = rawInteger.replace(/^0+(?=\d)/, '');
  return `${integer}.${rawFraction.padEnd(2, '0')}`;
}

function productBrandId(product: OrderFormProduct): string {
  return 'brandId' in product ? product.brandId : product.brand.id;
}

export function OrderForm({
  intent,
  orderId,
  brands,
  products,
  initialValues,
  referenceError,
  onUpdated,
}: OrderFormProps): React.JSX.Element {
  const isUpdate = intent === 'update';
  const [requestError, setRequestError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    id: string;
    cycle: string;
  } | null>(null);
  const [attempt, setAttempt] = useState<{
    payload: string;
    key: string;
  } | null>(null);
  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateOrderFields>({
    resolver: zodResolver(createOrderSchema),
    defaultValues: initialValues,
  });
  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: 'items',
  });
  const brandId = useWatch({ control, name: 'brandId' });
  const watchedItems = useWatch({ control, name: 'items' });
  const availableProducts = products.filter(
    (product) => productBrandId(product) === brandId,
  );
  const brandRegistration = register('brandId');
  const catalogAvailable = brands.length > 0 && products.length > 0;

  function selectProduct(index: number, productId: string): void {
    const product = products.find((item) => item.id === productId);
    setValue(`items.${index}.productId`, productId, { shouldValidate: true });
    setValue(`items.${index}.catalogUnitPrice`, product?.catalogPrice ?? '', {
      shouldValidate: true,
    });
    setValue(`items.${index}.purchaseUnitPrice`, product?.purchasePrice ?? '', {
      shouldValidate: true,
    });
    setValue(`items.${index}.originalUnitPrice`, product?.originalPrice ?? '', {
      shouldValidate: true,
    });
  }

  async function submit(fieldsValue: CreateOrderFields): Promise<void> {
    setRequestError(null);
    setSuccess(null);

    const payload = {
      brandId: fieldsValue.brandId,
      cycle: fieldsValue.cycle,
      orderDate: fieldsValue.orderDate,
      ...(fieldsValue.notes ? { notes: fieldsValue.notes } : {}),
      items: fieldsValue.items.map((item) => ({
        productId: item.productId,
        quantityOrdered: item.quantityOrdered,
        catalogUnitPrice: normalizeMoney(item.catalogUnitPrice),
        purchaseUnitPrice: normalizeMoney(item.purchaseUnitPrice),
        originalUnitPrice: normalizeMoney(item.originalUnitPrice),
        ...(item.notes ? { notes: item.notes } : {}),
      })),
    };
    const serializedPayload = JSON.stringify(payload);
    let currentAttempt = attempt;
    if (!isUpdate && (!currentAttempt || currentAttempt.payload !== serializedPayload)) {
      currentAttempt = { payload: serializedPayload, key: crypto.randomUUID() };
      setAttempt(currentAttempt);
    }

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (!isUpdate && currentAttempt) {
        headers['Idempotency-Key'] = currentAttempt.key;
      }
      const response = await fetch(
        isUpdate
          ? `${apiUrl}/api/v1/orders/${orderId}`
          : `${apiUrl}/api/v1/orders`,
        {
          method: isUpdate ? 'PUT' : 'POST',
          credentials: 'include',
          headers,
          body: serializedPayload,
        },
      );

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as ApiErrorEnvelope;
        setRequestError(
          body.error?.message ??
            (isUpdate
              ? 'NÃ£o foi possÃ­vel atualizar o pedido.'
              : 'NÃ£o foi possÃ­vel criar o pedido.'),
        );
        return;
      }

      const body = (await response.json()) as CreateOrderResponse;
      setSuccess(body.data);
      if (isUpdate) {
        reset({
          ...fieldsValue,
          cycle: fieldsValue.cycle.trim(),
          notes: fieldsValue.notes.trim(),
          items: payload.items.map((item) => ({
            ...item,
            notes: item.notes ?? '',
          })),
        });
        onUpdated?.();
      } else {
        setAttempt(null);
        reset(initialValues);
      }
    } catch {
      setRequestError('NÃ£o foi possÃ­vel conectar ao servidor. Tente novamente.');
    }
  }

  return (
    <form
      className="mt-8 max-w-5xl border-t border-border pt-7"
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

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="order-brand">Marca</Label>
          <NativeSelect
            id="order-brand"
            disabled={brands.length === 0}
            aria-invalid={Boolean(errors.brandId)}
            {...brandRegistration}
            onChange={(event) => {
              void brandRegistration.onChange(event);
              replace([emptyItem()]);
            }}
          >
            <option value="">Selecione</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </NativeSelect>
          {errors.brandId ? (
            <p className="text-sm text-destructive">{errors.brandId.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="order-cycle">Ciclo</Label>
          <Input
            id="order-cycle"
            maxLength={80}
            placeholder="Ex.: 12/2026"
            aria-invalid={Boolean(errors.cycle)}
            {...register('cycle')}
          />
          {errors.cycle ? (
            <p className="text-sm text-destructive">{errors.cycle.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="order-date">Data do pedido</Label>
          <Input
            id="order-date"
            type="date"
            aria-invalid={Boolean(errors.orderDate)}
            {...register('orderDate')}
          />
          {errors.orderDate ? (
            <p className="text-sm text-destructive">
              {errors.orderDate.message}
            </p>
          ) : null}
        </div>
        <div className="space-y-2 sm:col-span-2 lg:col-span-3">
          <Label htmlFor="order-notes">ObservaÃ§Ãµes do pedido</Label>
          <Input id="order-notes" maxLength={1000} {...register('notes')} />
        </div>
      </div>

      <div className="mt-8 border-t border-border pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Itens do pedido</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {brandId
                ? `${availableProducts.length} produtos disponÃ­veis para a marca.`
                : 'Selecione a marca para escolher os produtos.'}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            disabled={!brandId || availableProducts.length === 0}
            onClick={() => append(emptyItem())}
          >
            <Plus className="size-4" aria-hidden />
            Adicionar item
          </Button>
        </div>

        <div className="mt-4 divide-y divide-border border-y border-border">
          {fields.map((field, index) => {
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
                <div className="mt-4 grid gap-5 sm:grid-cols-[minmax(0,2fr)_minmax(8rem,0.6fr)]">
                  <div className="space-y-2">
                    <Label htmlFor={`order-item-${index}-product`}>Produto</Label>
                    <NativeSelect
                      id={`order-item-${index}-product`}
                      aria-label={`Produto do item ${index + 1}`}
                      disabled={!brandId}
                      value={watchedItems?.[index]?.productId ?? ''}
                      onChange={(event) => selectProduct(index, event.target.value)}
                    >
                      <option value="">Selecione</option>
                      {availableProducts.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.code} Â· {product.description}
                        </option>
                      ))}
                    </NativeSelect>
                    {itemError?.productId ? (
                      <p className="text-sm text-destructive">
                        {itemError.productId.message}
                      </p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`order-item-${index}-quantity`}>
                      Quantidade
                    </Label>
                    <Input
                      id={`order-item-${index}-quantity`}
                      type="number"
                      min={1}
                      step={1}
                      aria-label={`Quantidade do item ${index + 1}`}
                      aria-invalid={Boolean(itemError?.quantityOrdered)}
                      {...register(`items.${index}.quantityOrdered`, {
                        valueAsNumber: true,
                      })}
                    />
                    {itemError?.quantityOrdered ? (
                      <p className="text-sm text-destructive">
                        {itemError.quantityOrdered.message}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="mt-5 grid gap-5 sm:grid-cols-3">
                  {[
                    ['catalogUnitPrice', 'PreÃ§o de catÃ¡logo'],
                    ['purchaseUnitPrice', 'PreÃ§o de compra'],
                    ['originalUnitPrice', 'PreÃ§o original'],
                  ].map(([fieldName, label]) => {
                    const name = fieldName as
                      | 'catalogUnitPrice'
                      | 'purchaseUnitPrice'
                      | 'originalUnitPrice';
                    const error = itemError?.[name];
                    return (
                      <div className="space-y-2" key={name}>
                        <Label htmlFor={`order-item-${index}-${name}`}>
                          {label}
                        </Label>
                        <Input
                          id={`order-item-${index}-${name}`}
                          inputMode="decimal"
                          maxLength={13}
                          aria-label={`${label} do item ${index + 1}`}
                          aria-invalid={Boolean(error)}
                          {...register(`items.${index}.${name}`)}
                        />
                        {error ? (
                          <p className="text-sm text-destructive">
                            {error.message}
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-5 space-y-2">
                  <Label htmlFor={`order-item-${index}-notes`}>
                    ObservaÃ§Ãµes do item
                  </Label>
                  <Input
                    id={`order-item-${index}-notes`}
                    maxLength={500}
                    {...register(`items.${index}.notes`)}
                  />
                </div>
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
          className="mt-5 flex items-start gap-2 border-l-2 border-ring bg-muted px-3 py-2.5 text-sm text-foreground"
        >
          <CircleCheck className="mt-0.5 size-4 shrink-0 text-ring" aria-hidden />
          <span>
            Pedido do ciclo {success.cycle}{' '}
            {isUpdate ? 'atualizado.' : 'criado.'}
            {!isUpdate ? (
              <>
                {' '}
                <Link
                  href={`/orders/${success.id}/edit`}
                  className="font-semibold text-ring hover:underline"
                >
                  Editar pedido
                </Link>
              </>
            ) : null}
          </span>
        </div>
      ) : null}

      <Button
        className="mt-6"
        type="submit"
        disabled={isSubmitting || !catalogAvailable}
      >
        {isSubmitting ? (
          <>
            <LoaderCircle className="size-4 animate-spin" aria-hidden />
            {isUpdate ? 'Salvando alteraÃ§Ãµes' : 'Criando pedido'}
          </>
        ) : (
          <>
            {isUpdate ? (
              <Save className="size-4" aria-hidden />
            ) : (
              <ClipboardPlus className="size-4" aria-hidden />
            )}
            {isUpdate ? 'Salvar alteraÃ§Ãµes' : 'Criar pedido'}
          </>
        )}
      </Button>
    </form>
  );
}

export function CreateOrderForm({
  initialOrderDate,
  ...props
}: CreateOrderFormProps): React.JSX.Element {
  return (
    <OrderForm
      intent="create"
      initialValues={{
        brandId: '',
        cycle: '',
        orderDate: initialOrderDate,
        notes: '',
        items: [emptyItem()],
      }}
      {...props}
    />
  );
}

