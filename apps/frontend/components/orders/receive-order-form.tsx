'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertCircle,
  CircleCheck,
  LoaderCircle,
  PackageCheck,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { OrderDetails } from '@/lib/orders';

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validOptionalDate(value: string): boolean {
  if (value.length === 0) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

const receiveOrderSchema = z.object({
  items: z
    .array(
      z
        .object({
          orderItemId: z.string().regex(uuidPattern),
          quantityOrdered: z.number().int().min(1),
          quantityReceived: z
            .number({ error: 'Informe a quantidade recebida.' })
            .int('A quantidade deve ser inteira.')
            .min(0, 'A quantidade não pode ser negativa.'),
          expirationDate: z
            .string()
            .refine(validOptionalDate, 'Informe uma data de validade válida.'),
          notes: z.string().trim().max(500, 'Use no máximo 500 caracteres.'),
        })
        .superRefine((item, context) => {
          if (item.quantityReceived > item.quantityOrdered) {
            context.addIssue({
              code: 'custom',
              message: `A quantidade máxima para este item é ${item.quantityOrdered}.`,
              path: ['quantityReceived'],
            });
          }
        }),
    )
    .min(1),
});

type ReceiveOrderFields = z.infer<typeof receiveOrderSchema>;

interface ReceiveOrderFormProps {
  order: OrderDetails;
}

interface ApiErrorEnvelope {
  error?: { message?: string };
}

interface ReceiveOrderResponse {
  data: { id: string; cycle: string };
}

const apiUrl = '';

export function ReceiveOrderForm({
  order,
}: ReceiveOrderFormProps): React.JSX.Element {
  const [requestError, setRequestError] = useState<string | null>(null);
  const [receivedCycle, setReceivedCycle] = useState<string | null>(null);
  const [attempt, setAttempt] = useState<{
    payload: string;
    key: string;
  } | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ReceiveOrderFields>({
    resolver: zodResolver(receiveOrderSchema),
    defaultValues: {
      items: order.items.map((item) => ({
        orderItemId: item.id,
        quantityOrdered: item.quantityOrdered,
        quantityReceived: item.quantityOrdered,
        expirationDate: item.expirationDate ?? '',
        notes: item.notes ?? '',
      })),
    },
  });

  async function submit(fields: ReceiveOrderFields): Promise<void> {
    setRequestError(null);
    setReceivedCycle(null);

    const payload = {
      items: fields.items.map((item) => ({
        orderItemId: item.orderItemId,
        quantityReceived: item.quantityReceived,
        ...(item.expirationDate
          ? { expirationDate: item.expirationDate }
          : {}),
        ...(item.notes ? { notes: item.notes } : {}),
      })),
    };
    const serializedPayload = JSON.stringify(payload);
    let currentAttempt = attempt;
    if (!currentAttempt || currentAttempt.payload !== serializedPayload) {
      currentAttempt = {
        payload: serializedPayload,
        key: crypto.randomUUID(),
      };
      setAttempt(currentAttempt);
    }

    try {
      const response = await fetch(
        `${apiUrl}/api/v1/orders/${order.id}/receive`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': currentAttempt.key,
          },
          body: serializedPayload,
        },
      );
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as ApiErrorEnvelope;
        setRequestError(
          body.error?.message ?? 'Não foi possível receber o pedido.',
        );
        return;
      }

      const body = (await response.json()) as ReceiveOrderResponse;
      setAttempt(null);
      setReceivedCycle(body.data.cycle);
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
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
        <div>
          <p className="text-sm font-semibold">{order.brand.name}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ciclo {order.cycle} · {order.items.length}{' '}
            {order.items.length === 1 ? 'item' : 'itens'}
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          Pedido em {new Date(`${order.orderDate}T12:00:00`).toLocaleDateString('pt-BR')}
        </p>
      </div>

      <div className="divide-y divide-border border-b border-border">
        {order.items.map((item, index) => {
          const itemErrors = errors.items?.[index];

          return (
            <section key={item.id} className="py-6">
              <input
                type="hidden"
                {...register(`items.${index}.orderItemId`)}
              />
              <input
                type="hidden"
                {...register(`items.${index}.quantityOrdered`, {
                  valueAsNumber: true,
                })}
              />
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{item.productCode}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.productDescription}
                  </p>
                </div>
                <p className="text-sm font-medium">
                  Pedido: {item.quantityOrdered}
                </p>
              </div>

              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={`receipt-item-${index}-quantity`}>
                    Quantidade recebida
                  </Label>
                  <Input
                    id={`receipt-item-${index}-quantity`}
                    type="number"
                    min={0}
                    max={item.quantityOrdered}
                    step={1}
                    aria-label={`Quantidade recebida de ${item.productCode}`}
                    aria-invalid={Boolean(itemErrors?.quantityReceived)}
                    {...register(`items.${index}.quantityReceived`, {
                      valueAsNumber: true,
                    })}
                  />
                  {itemErrors?.quantityReceived ? (
                    <p className="text-sm text-destructive">
                      {itemErrors.quantityReceived.message}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`receipt-item-${index}-expiration`}>
                    Validade (opcional)
                  </Label>
                  <Input
                    id={`receipt-item-${index}-expiration`}
                    type="date"
                    aria-label={`Validade de ${item.productCode}`}
                    aria-invalid={Boolean(itemErrors?.expirationDate)}
                    {...register(`items.${index}.expirationDate`)}
                  />
                  {itemErrors?.expirationDate ? (
                    <p className="text-sm text-destructive">
                      {itemErrors.expirationDate.message}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="mt-5 space-y-2">
                <Label htmlFor={`receipt-item-${index}-notes`}>
                  Observações
                </Label>
                <Input
                  id={`receipt-item-${index}-notes`}
                  maxLength={500}
                  aria-label={`Observações de ${item.productCode}`}
                  aria-invalid={Boolean(itemErrors?.notes)}
                  {...register(`items.${index}.notes`)}
                />
                {itemErrors?.notes ? (
                  <p className="text-sm text-destructive">
                    {itemErrors.notes.message}
                  </p>
                ) : null}
              </div>
            </section>
          );
        })}
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
      {receivedCycle ? (
        <div
          role="status"
          className="mt-5 flex items-start gap-2 border-l-2 border-ring bg-muted px-3 py-2.5 text-sm text-foreground"
        >
          <CircleCheck className="mt-0.5 size-4 shrink-0 text-ring" aria-hidden />
          <span>Pedido do ciclo {receivedCycle} recebido.</span>
        </div>
      ) : null}

      <Button
        className="mt-6"
        type="submit"
        disabled={isSubmitting || Boolean(receivedCycle)}
      >
        {isSubmitting ? (
          <>
            <LoaderCircle className="size-4 animate-spin" aria-hidden />
            Confirmando recebimento
          </>
        ) : (
          <>
            <PackageCheck className="size-4" aria-hidden />
            {receivedCycle ? 'Pedido recebido' : 'Confirmar recebimento'}
          </>
        )}
      </Button>
    </form>
  );
}
