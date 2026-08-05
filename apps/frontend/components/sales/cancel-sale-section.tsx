'use client';

import { useRef, useState } from 'react';
import {
  AlertCircle,
  Ban,
  CheckCircle2,
  LoaderCircle,
  TriangleAlert,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CancelSaleSectionProps {
  saleId: string;
  total: string;
}

interface ApiErrorEnvelope {
  error?: { message?: string };
}

const apiUrl = '';
const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

export function CancelSaleSection({
  saleId,
  total,
}: CancelSaleSectionProps): React.JSX.Element {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reason, setReason] = useState('');
  const [requestError, setRequestError] = useState<string | null>(null);
  const [canceled, setCanceled] = useState(false);
  const idempotencyKey = useRef<string | null>(null);
  const normalizedReason = reason.normalize('NFKC').trim();
  const reasonValid = normalizedReason.length > 0 && normalizedReason.length <= 500;

  async function cancelSale(): Promise<void> {
    if (!reasonValid) return;
    setIsSubmitting(true);
    setRequestError(null);
    idempotencyKey.current ??= crypto.randomUUID();

    try {
      const response = await fetch(`${apiUrl}/api/v1/sales/${saleId}/cancel`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey.current,
        },
        body: JSON.stringify({ reason: normalizedReason }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as ApiErrorEnvelope;
        setRequestError(body.error?.message ?? 'Não foi possível cancelar a venda.');
        return;
      }
      setCanceled(true);
      setIsConfirming(false);
    } catch {
      setRequestError('Não foi possível conectar ao servidor. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (canceled) {
    return (
      <div className="mt-6 border-t border-border pt-5">
        <div
          role="status"
          className="flex items-start gap-2 border-l-2 border-ring bg-muted px-3 py-2.5 text-sm"
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-ring" aria-hidden />
          <span>
            Venda de {currency.format(Number(total))} cancelada. O estoque foi
            recomposto.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 border-t border-border pt-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold">Situação da venda</p>
          <p className="mt-1 text-sm text-muted-foreground">Concluída</p>
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
            Cancelar venda
          </Button>
        ) : null}
      </div>

      {isConfirming ? (
        <div
          role="group"
          aria-label="Confirmar cancelamento da venda"
          className="mt-5 border-l-2 border-destructive bg-destructive/5 px-3 py-3"
        >
          <p className="flex items-start gap-2 text-sm">
            <TriangleAlert
              className="mt-0.5 size-4 shrink-0 text-destructive"
              aria-hidden
            />
            <span>
              A venda será cancelada e todos os itens retornarão ao estoque.
            </span>
          </p>
          <div className="mt-4 max-w-2xl space-y-2">
            <Label htmlFor={`sale-${saleId}-cancel-reason`}>
              Motivo do cancelamento
            </Label>
            <Input
              id={`sale-${saleId}-cancel-reason`}
              value={reason}
              maxLength={500}
              disabled={isSubmitting}
              onChange={(event) => {
                setReason(event.target.value);
                idempotencyKey.current = null;
              }}
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
              onClick={cancelSale}
            >
              {isSubmitting ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" aria-hidden />
                  Cancelando venda
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
