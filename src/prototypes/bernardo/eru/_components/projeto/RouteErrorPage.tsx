// The notice that takes the screen when a route does not open, ported from eru features/shell/RouteErrorPage. With the
// dashboard down, it says so; with any other error, it says it was this screen and keeps the message in "Detalhes técnicos".
import { useState } from 'react';
import { Button } from '@/systems/eru/components/button';
import { Spinner } from '@/systems/eru/components/spinner';

export function RouteErrorPage({ unavailable = false, detail }: { unavailable?: boolean; detail?: string }) {
  const [retrying, setRetrying] = useState(false);
  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-6 text-foreground">
      <div className="flex max-w-sm flex-col items-center gap-3 text-center">
        <h1 className="font-heading text-xl font-semibold">{unavailable ? 'Não foi possível falar com o dashboard do Hermes' : 'Algo deu errado nesta tela'}</h1>
        <p className="text-sm text-muted-foreground">
          {unavailable ? 'Confira se ele está no ar e tente de novo.' : 'O problema foi nesta tela, não na conexão com o dashboard. Tente de novo; se continuar, os detalhes abaixo ajudam a corrigir.'}
        </p>
        <Button
          onClick={() => {
            setRetrying(true);
            window.setTimeout(() => setRetrying(false), 1200);
          }}
          disabled={retrying}
        >
          {retrying ? <Spinner /> : null}
          Tentar de novo
        </Button>
        {unavailable ? null : (
          <details className="w-full text-xs text-muted-foreground">
            <summary className="inline-flex min-h-11 cursor-pointer items-center rounded-md px-1 select-none hover:text-ink sm:min-h-7">Detalhes técnicos</summary>
            <p className="mt-1 font-mono text-[11px] wrap-anywhere whitespace-pre-wrap">{detail}</p>
          </details>
        )}
      </div>
    </main>
  );
}
