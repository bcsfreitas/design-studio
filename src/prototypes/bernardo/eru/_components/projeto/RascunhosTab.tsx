// The Rascunhos tab, ported from eru features/rascunhos/RascunhosList: the project's drafts (folders in .scratch/) grouped
// by type, newest first. A draft with a sheet shows its cover, date, branch and outcome; without one, its first shots.
import { useId } from 'react';
import { cn } from '#studio/runtime';
import { ErrorState } from '@/systems/eru/components/error-state';
import { LoadingState } from '@/systems/eru/components/loading-state';
import { GitBranch } from '@/systems/eru/libraries/icons';
import type { Desfecho, Rascunho } from '../data/projeto';
import { useProjectPage } from './context';
import { EmptyTab } from './parts';
import { Shot } from './Shot';

const ROW = 'flex min-h-11 min-w-0 items-center gap-3 rounded-lg p-2 transition-colors duration-150 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none';

const SHOTS_IN_ROW = 4;

const DESFECHO_LABEL: Record<Desfecho, string> = { explorando: 'Explorando', escolhido: 'Escolhido', descartado: 'Descartado' };

/** The outcome in words, with a dot: gold for the chosen one, faded for the discarded one. */
export function DesfechoMark({ desfecho, className }: { desfecho: Desfecho; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5', desfecho === 'escolhido' && 'text-gold-text', desfecho === 'descartado' && 'text-muted-foreground/70', className)}>
      <span aria-hidden className={cn('size-1.5 rounded-full bg-current', desfecho === 'explorando' && 'opacity-50')} />
      {DESFECHO_LABEL[desfecho]}
    </span>
  );
}

function BranchMark({ branch }: { branch: string }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1" title={`Branch ${branch}`}>
      <GitBranch aria-hidden className="size-3 shrink-0" />
      <span className="truncate font-mono text-[11.5px]">{branch}</span>
    </span>
  );
}

function Dot() {
  return <span aria-hidden>·</span>;
}

function DraftRow({ rascunho }: { rascunho: Rascunho }) {
  const id = useId();
  const extra = rascunho.shots.length - SHOTS_IN_ROW + (rascunho.maisShots ?? 0);
  return (
    <li>
      <a href="#" onClick={event => event.preventDefault()} aria-labelledby={`${id}-nome`} aria-describedby={`${id}-detalhe`} className={ROW}>
        {rascunho.ficha ? <Shot look={rascunho.capa} alt={`Capa de ${rascunho.nome}`} className="aspect-[16/10] w-24 shrink-0 rounded-md border border-h1" /> : null}
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span id={`${id}-nome`} className="truncate text-sm font-medium">
            {rascunho.nome}
          </span>
          <span id={`${id}-detalhe`} className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            <span>{rascunho.dia}</span>
            {rascunho.ficha ? (
              <>
                {rascunho.branch ? (
                  <>
                    <Dot />
                    <BranchMark branch={rascunho.branch} />
                  </>
                ) : null}
                <Dot />
                <DesfechoMark desfecho={rascunho.desfecho ?? 'explorando'} />
              </>
            ) : (
              <>
                <Dot />
                <span>Sem ficha</span>
              </>
            )}
          </span>
          {!rascunho.ficha && rascunho.shots.length > 0 ? (
            <span className="flex min-w-0 gap-1.5 pt-1" aria-label={`Shots de ${rascunho.nome}`} role="group">
              {rascunho.shots.slice(0, SHOTS_IN_ROW).map((shot, index) => (
                <Shot key={index} look={shot} alt={`shot-${index + 1}.png`} className="aspect-[16/10] w-16 min-w-0 shrink rounded border border-h1" />
              ))}
              {extra > 0 ? <span className="self-center text-xs text-muted-foreground">+{extra}</span> : null}
            </span>
          ) : null}
        </span>
      </a>
    </li>
  );
}

const groupId = (tipo: string) => `rascunhos-${tipo.replace(/[^\w-]/g, '_')}`;

export function RascunhosTab() {
  const { data, status, retry } = useProjectPage();

  if (status === 'carregando') return <LoadingState label="Carregando os rascunhos" lines={4} />;
  if (status === 'erro') return <ErrorState title="Não foi possível ler os rascunhos do projeto." onRetry={retry} />;
  if (data.rascunhos.length === 0) return <EmptyTab>Nenhum rascunho ainda. Quando o agente fizer um sketch ou um protótipo neste projeto, ele aparece aqui.</EmptyTab>;

  const groups = [...new Set(data.rascunhos.map(rascunho => rascunho.tipo))].map(tipo => ({ tipo, items: data.rascunhos.filter(rascunho => rascunho.tipo === tipo) }));
  return (
    <div className="flex flex-col gap-6">
      {groups.map(({ tipo, items }) => (
        <section key={tipo} aria-labelledby={groupId(tipo)} className="flex flex-col gap-1">
          <h2 id={groupId(tipo)} className="px-2 text-[13px] font-medium text-muted-foreground">
            {tipo}
          </h2>
          <ul className="flex flex-col gap-0.5">
            {items.map(rascunho => (
              <DraftRow key={rascunho.id} rascunho={rascunho} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
