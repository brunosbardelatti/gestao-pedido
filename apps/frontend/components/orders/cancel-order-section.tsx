'use client';

import { useState } from 'react';
import {
  AlertCircle,
  Ban,
  CircleCheck,
  LoaderCircle,
  TriangleAlert,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CancelOrderSectionProps {
  orderId: string;
  cycle: string;
}

interface ApiErrorEnvelope {
  error?: { message?: string };
}

interface CancelOrderResponse {
  data: { cycle: string; status: 'CANCELED' };
}

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export function CancelOrderSection({
  orderId,
  cycle,
}: CancelOrderSectionProps): React.JSX.Element {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reason, setReason] = useState('');
  const [requestError, setRequestError] = useState<string | null>(null);
  const [canceledCycle, setCanceledCycle] = useState<string | null>(null);
  const normalizedReason = reason.normalize('NFKC').trim();
  const reasonValid =
    normalizedReason.length > 0 && normalizedReason.length <= 500;

  async function cancelOrder(): Promise<void> {
    if (!reasonValid) return;

    setIsSubmitting(true);
    setRequestError(null);

    try {
      const response = await fetch(`${apiUrl}/api/v1/orders/${orderId}/cancel`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: normalizedReason }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as ApiErrorEnvelope;
        setRequestError(
          body.error?.message ?? 'Não foi possível cancelar o pedido.',
        );
        return;
      }

      const body = (await response.json()) as CancelOrderResponse;
      setCanceledCycle(body.data.cycle);
      setIsConfirming(false);
    } catch {
      setRequestError('Não foi possível conectar ao servidor. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (canceledCycle) {
    return (
      <div className="mt-8 max-w-5xl border-t border-border pt-6">
        <div
          role="status"
          className="flex items-start gap-2 border-l-2 border-ring bg-muted px-3 py-2.5 text-sm text-foreground"
        >
          <CircleCheck className="mt-0.5 size-4 shrink-0 text-ring" aria-hidden />
          <span>Pedido do ciclo {canceledCycle} cancelado.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 max-w-5xl border-t border-border pt-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold">Situação do pedido</p>
          <p className="mt-1 text-sm text-muted-foreground">Em aberto</p>
        </div>
        {!isConfirming ? (
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              setRequestError(null);
              setIsConfirming(true);
            }}
          >
            <Ban className="size-4" aria-hidden />
            Cancelar pedido
          </Button>
        ) : null}
      </div>

      {isConfirming ? (
        <div
          role="group"
          aria-label="Confirmar cancelamento do pedido"
          className="mt-5 border-l-2 border-destructive bg-destructive/5 px-3 py-3"
        >
          <p className="flex items-start gap-2 text-sm text-foreground">
            <TriangleAlert
              className="mt-0.5 size-4 shrink-0 text-destructive"
              aria-hidden
            />
            <span>O pedido do ciclo {cycle} será cancelado.</span>
          </p>
          <div className="mt-4 max-w-2xl space-y-2">
            <Label htmlFor="order-cancel-reason">Motivo do cancelamento</Label>
            <Input
              id="order-cancel-reason"
              value={reason}
              maxLength={500}
              disabled={isSubmitting}
              onChange={(event) => setReason(event.target.value)}
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={isSubmitting}
              onClick={() => {
                setIsConfirming(false);
                setRequestError(null);
              }}
            >
              Voltar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isSubmitting || !reasonValid}
              onClick={cancelOrder}
            >
              {isSubmitting ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" aria-hidden />
                  Cancelando pedido
                </>
              ) : (
                <>
                  <Ban className="size-4" aria-hidden />
                  Confirmar cancelamento
                </>
              )}
            </Button>
          </div>
        </div>
      ) : null}

      {requestError ? (
        <div
          role="alert"
          className="mt-5 flex items-start gap-2 border-l-2 border-destructive bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{requestError}</span>
        </div>
      ) : null}
    </div>
  );
}
