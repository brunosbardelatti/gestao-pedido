'use client';

import { useState } from 'react';
import {
  AlertCircle,
  CircleMinus,
  CircleOff,
  LoaderCircle,
  TriangleAlert,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';

interface DeactivateBrandButtonProps {
  brandId: string;
  brandName: string;
  initialActive: boolean;
}

interface ApiErrorEnvelope {
  error?: {
    message?: string;
  };
}

interface SetBrandActiveResponse {
  data: {
    name: string;
    active: boolean;
  };
}

const apiUrl = '';

export function DeactivateBrandButton({
  brandId,
  brandName,
  initialActive,
}: DeactivateBrandButtonProps): React.JSX.Element {
  const router = useRouter();
  const [active, setActive] = useState(initialActive);
  const [confirmedName, setConfirmedName] = useState(brandName);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  async function deactivate(): Promise<void> {
    setIsSubmitting(true);
    setRequestError(null);

    try {
      const response = await fetch(`${apiUrl}/api/v1/brands/${brandId}/active`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: false }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as ApiErrorEnvelope;
        setRequestError(
          body.error?.message ?? 'Não foi possível inativar a marca.',
        );
        setIsConfirming(false);
        return;
      }

      const body = (await response.json()) as SetBrandActiveResponse;
      setActive(body.data.active);
      setConfirmedName(body.data.name);
      setIsConfirming(false);
      router.replace(
        `/brands/${brandId}/edit?name=${encodeURIComponent(body.data.name)}&active=${body.data.active}`,
        { scroll: false },
      );
    } catch {
      setRequestError('Não foi possível conectar ao servidor. Tente novamente.');
      setIsConfirming(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!active) {
    return (
      <div className="mt-10 max-w-xl border-t border-border pt-7">
        <p className="text-sm font-semibold">Situação da marca</p>
        <div
          role="status"
          className="mt-3 flex items-start gap-2 border-l-2 border-ring bg-muted px-3 py-2.5 text-sm text-foreground"
        >
          <CircleMinus className="mt-0.5 size-4 shrink-0 text-ring" aria-hidden />
          <span>Marca {confirmedName} inativada.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-10 max-w-xl border-t border-border pt-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold">Situação da marca</p>
          <p className="mt-1 text-sm text-muted-foreground">Ativa</p>
        </div>
        {!isConfirming ? (
          <Button
            type="button"
            variant="destructive"
            onClick={() => setIsConfirming(true)}
          >
            <CircleOff className="size-4" aria-hidden />
            Inativar marca
          </Button>
        ) : null}
      </div>

      {isConfirming ? (
        <div
          role="group"
          aria-label={`Confirmar inativação de ${brandName}`}
          className="mt-5 border-l-2 border-destructive bg-destructive/5 px-3 py-3"
        >
          <p className="flex items-start gap-2 text-sm text-foreground">
            <TriangleAlert
              className="mt-0.5 size-4 shrink-0 text-destructive"
              aria-hidden
            />
            <span>Confirmar inativação de {brandName}?</span>
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
                  Inativando marca
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
