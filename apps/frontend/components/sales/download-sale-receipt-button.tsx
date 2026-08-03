'use client';

import { useState } from 'react';
import { AlertCircle, Check, Download, LoaderCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface DownloadSaleReceiptButtonProps {
  saleId: string;
}

interface ApiErrorEnvelope {
  error?: { message?: string };
}

const apiUrl = '';

export function DownloadSaleReceiptButton({
  saleId,
}: DownloadSaleReceiptButtonProps): React.JSX.Element {
  const [isDownloading, setIsDownloading] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [downloaded, setDownloaded] = useState(false);

  async function downloadReceipt(): Promise<void> {
    setIsDownloading(true);
    setRequestError(null);
    setDownloaded(false);
    try {
      const response = await fetch(`${apiUrl}/api/v1/sales/${saleId}/receipt`, {
        credentials: 'include',
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as ApiErrorEnvelope;
        setRequestError(body.error?.message ?? 'NÃ£o foi possÃ­vel baixar o recibo.');
        return;
      }
      const objectUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `recibo-venda-${saleId}.pdf`;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
      setDownloaded(true);
    } catch {
      setRequestError('NÃ£o foi possÃ­vel conectar ao servidor. Tente novamente.');
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div className="mt-4">
      <Button type="button" variant="ghost" disabled={isDownloading} onClick={downloadReceipt}>
        {isDownloading ? (
          <>
            <LoaderCircle className="size-4 animate-spin" aria-hidden />
            Gerando recibo
          </>
        ) : (
          <>
            <Download className="size-4" aria-hidden />
            Baixar recibo
          </>
        )}
      </Button>
      {downloaded ? (
        <p role="status" className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
          <Check className="size-4 text-ring" aria-hidden />
          Recibo baixado.
        </p>
      ) : null}
      {requestError ? (
        <p role="alert" className="mt-2 flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="size-4" aria-hidden />
          {requestError}
        </p>
      ) : null}
    </div>
  );
}

