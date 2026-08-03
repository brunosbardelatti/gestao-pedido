'use client';

import { useState } from 'react';
import {
  AlertCircle,
  CircleMinus,
  CircleOff,
  LoaderCircle,
  TriangleAlert,
} from 'lucide-react';

import { Button } from '@/components/ui/button';

interface DeactivateProductButtonProps {
  productId: string;
  productCode: string;
  initialActive: boolean;
}

interface ApiErrorEnvelope {
  error?: {
    message?: string;
  };
}

interface SetProductActiveResponse {
  data: {
    code: string;
    active: boolean;
  };
}

const apiUrl = '';

export function DeactivateProductButton({
  productId,
  productCode,
  initialActive,
}: DeactivateProductButtonProps): React.JSX.Element {
  const [active, setActive] = useState(initialActive);
  const [confirmedCode, setConfirmedCode] = useState(productCode);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  async function deactivate(): Promise<void> {
    setIsSubmitting(true);
    setRequestError(null);

    try {
      const response = await fetch(
        `${apiUrl}/api/v1/products/${productId}/active`,
        {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ active: false }),
        },
      );

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as ApiErrorEnvelope;
        setRequestError(
          body.error?.message ?? 'Não foi possível inativar o produto.',
        );
        setIsConfirming(false);
        return;
      }

      const body = (await response.json()) as SetProductActiveResponse;
      setActive(body.data.active);
      setConfirmedCode(body.data.code);
      setIsConfirming(false);
    } catch {
      setRequestError('Não foi possível conectar ao servidor. Tente novamente.');
      setIsConfirming(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!active) {
    return (
      <div className="mt-10 max-w-3xl border-t border-border pt-7">
        <p className="text-sm font-semibold">Situação do produto</p>
        <div
          role="status"
          className="mt-3 flex items-start gap-2 border-l-2 border-ring bg-muted px-3 py-2.5 text-sm text-foreground"
        >
          <CircleMinus className="mt-0.5 size-4 shrink-0 text-ring" aria-hidden />
          <span>Produto {confirmedCode} inativado.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-10 max-w-3xl border-t border-border pt-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold">Situação do produto</p>
          <p className="mt-1 text-sm text-muted-foreground">Ativo</p>
        </div>
        {!isConfirming ? (
          <Button
            type="button"
            variant="destructive"
            onClick={() => setIsConfirming(true)}
          >
            <CircleOff className="size-4" aria-hidden />
            Inativar produto
          </Button>
        ) : null}
      </div>

      {isConfirming ? (
        <div
          role="group"
          aria-label={`Confirmar inativação de ${productCode}`}
          className="mt-5 border-l-2 border-destructive bg-destructive/5 px-3 py-3"
        >
          <p className="flex items-start gap-2 text-sm text-foreground">
            <TriangleAlert
              className="mt-0.5 size-4 shrink-0 text-destructive"
              aria-hidden
            />
            <span>Confirmar inativação de {productCode}?</span>
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={isSubmitting}
              onClick={() => setIsConfirming(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isSubmitting}
              onClick={deactivate}
            >
              {isSubmitting ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" aria-hidden />
                  Inativando produto
                </>
              ) : (
                <>
                  <CircleOff className="size-4" aria-hidden />
                  Confirmar inativação
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
