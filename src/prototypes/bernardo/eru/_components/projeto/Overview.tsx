// The overview tab, ported from eru features/project-page/overview: the project's header, the field to start a session in
// it and the blocks, each one gone when it has nothing to show (Em andamento, Esperando você, Rascunhos, Notas, Servidores
// ligados, Skills de engenharia, Sessões recentes).
import { useId, useState } from 'react';
import { useNavigate } from '@module/prototypes';
import { cn } from '#studio/runtime';
import { Button } from '@/systems/eru/components/button';
import { SealIcon } from '@/systems/eru/components/seal-icon';
import { ArrowUpRight, CircleCheck, CircleDashed, CircleMinus, CircleX, GitBranch, GitPullRequest, type LucideIcon } from '@/systems/eru/libraries/icons';
import { COLUNA_DO_ESTADO, ESTADO_LABEL, type PullRequest } from '../data/projeto';
import { Composer } from './Composer';
import { leafOf, useProjectPage } from './context';
import { DesfechoMark } from './RascunhosTab';
import { HomeCard, SessionRow } from './parts';
import { Shot } from './Shot';
import { handNoteOver, TabLink } from './nav';

const PR_STATES: Record<PullRequest['estado'], string> = { open: 'aberto', draft: 'rascunho', merged: 'mesclado', closed: 'fechado' };
const PR_COLOR: Record<PullRequest['estado'], string> = { open: 'text-[var(--green)]', draft: 'text-muted-foreground', merged: 'text-gold-text', closed: 'text-[var(--red)]' };
const CHECK_ICON: Record<PullRequest['checks'][number]['estado'], LucideIcon> = { passou: CircleCheck, falhou: CircleX, rodando: CircleDashed, pulou: CircleMinus };
const CHECK_COLOR: Record<PullRequest['checks'][number]['estado'], string> = { passou: 'text-[var(--green)]', falhou: 'text-[var(--red)]', rodando: 'text-gold-text', pulou: '' };

/** "2 de 3 passaram · 1 rodando", with a small icon per check. */
function ChecksSummary({ pr }: { pr: PullRequest }) {
  const list = pr.checks;
  if (list.length === 0) return null;
  const passed = list.filter(check => check.estado === 'passou').length;
  const running = list.filter(check => check.estado === 'rodando').length;
  const failed = list.filter(check => check.estado === 'falhou').length;
  return (
    <small className="flex shrink-0 items-center gap-[3px] text-xs whitespace-nowrap">
      {list.map(check => {
        const Icon = CHECK_ICON[check.estado];
        return <Icon key={check.nome} aria-hidden className={cn('size-3', CHECK_COLOR[check.estado])} />;
      })}
      <span className="ml-1">
        {passed} de {list.length} {list.length === 1 ? 'passou' : 'passaram'}
        {failed ? ` · ${failed} ${failed === 1 ? 'falhou' : 'falharam'}` : ''}
        {running ? ` · ${running} rodando` : ''}
      </span>
    </small>
  );
}

/** The top of the overview: the seal, the name and the folder and, in a repository, the branch and its pull request. */
function ProjectHeader() {
  const { data, known, status } = useProjectPage();
  const pr = data.pr;
  return (
    <header className="flex items-start gap-4">
      <SealIcon seal={data.project.seal} size={44} tone="muted" decorative className="shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <h2 className="truncate font-display text-[28px] leading-tight font-normal">{known ? data.project.label : leafOf(data.folder)}</h2>
        <p title={data.folder} className="truncate font-mono text-xs text-muted-foreground">
          {data.project.path}
        </p>
        {data.branch && status !== 'carregando' ? (
          <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex min-w-0 items-center gap-1.5 font-mono">
              <GitBranch aria-hidden className="size-3.5 shrink-0" />
              <span className="sr-only">Branch </span>
              <span className="truncate">{data.branch}</span>
            </span>
            {pr ? (
              <span className="inline-flex min-w-0 items-center gap-2">
                <a href={`https://github.com/bcsfreitas/eru/pull/${pr.numero}`} target="_blank" rel="noreferrer" title={pr.titulo} className="inline-flex min-w-0 items-center gap-1.5 hover:text-foreground">
                  <GitPullRequest aria-hidden className="size-3.5 shrink-0" />
                  <span className="truncate">
                    #{pr.numero} {pr.titulo}
                  </span>
                  <ArrowUpRight aria-hidden className="size-3 shrink-0" />
                </a>
                <span className={cn('shrink-0 rounded-full border border-h2 px-[7px] py-[2px] font-mono text-[10px] leading-normal tracking-[0.12em] uppercase', PR_COLOR[pr.estado])}>{PR_STATES[pr.estado]}</span>
                <ChecksSummary pr={pr} />
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </header>
  );
}

function InProgressBlock() {
  const { data } = useProjectPage();
  const live = data.sessions.filter(session => session.working || session.waiting);
  if (live.length === 0) return null;
  return (
    <HomeCard title="Em andamento" titleId="projeto-em-andamento">
      <ul aria-label="Sessões em andamento" className="flex flex-col divide-y">
        {live.map(session => (
          <SessionRow key={session.id} session={session} seal={data.project.seal} live />
        ))}
      </ul>
    </HomeCard>
  );
}

/** The board's cards that wait for Bernardo (blocked and in review), each one opening in the drawer without leaving the overview. */
function WaitingCardsBlock() {
  const { cards, drawer, setDrawer } = useProjectPage();
  const waiting = cards.filter(card => COLUNA_DO_ESTADO[card.estado] === 'esperando');
  if (waiting.length === 0) return null;
  return (
    <HomeCard title="Esperando você" titleId="projeto-cards-esperando">
      <ul aria-label="Cards que esperam você" className="flex flex-col divide-y">
        {waiting.map(card => (
          <li key={card.id}>
            <button
              type="button"
              onClick={() => setDrawer({ kind: 'card', id: card.id })}
              aria-current={drawer?.kind === 'card' && drawer.id === card.id ? 'true' : undefined}
              className="flex min-h-11 w-full min-w-0 cursor-pointer items-center gap-3 py-2.5 pr-4 pl-(--axis) text-left transition-colors duration-150 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset aria-[current=true]:bg-h1 aria-[current=true]:shadow-[inset_2px_0_0_rgb(var(--tint))] motion-reduce:transition-none"
            >
              <span className="min-w-0 flex-1 truncate text-sm">{card.titulo}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{ESTADO_LABEL[card.estado]}</span>
            </button>
          </li>
        ))}
      </ul>
    </HomeCard>
  );
}

const QUIET_META = 'cursor-pointer hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none';

function RecentDraftsBlock() {
  const { data } = useProjectPage();
  const recent = data.rascunhos.slice(0, 3);
  const id = useId();
  if (recent.length === 0) return null;
  return (
    <HomeCard
      title="Rascunhos"
      titleId="projeto-rascunhos"
      meta={
        <TabLink tab="rascunhos" className={QUIET_META}>
          Ver todos
        </TabLink>
      }
    >
      <ul aria-label="Rascunhos recentes" className="grid grid-cols-3 gap-2 pt-1.5 sm:gap-3">
        {recent.map(rascunho => (
          <li key={rascunho.id} className="min-w-0">
            <TabLink
              tab="rascunhos"
              aria-labelledby={`${id}-${rascunho.id}-nome`}
              className="group flex w-full min-w-0 cursor-pointer flex-col gap-1.5 rounded-lg p-1 text-left transition-colors duration-150 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none"
            >
              <Shot look={rascunho.capa ?? rascunho.shots[0]} alt={`Capa de ${rascunho.nome}`} className="aspect-[16/10] w-full rounded-md border border-h1" />
              <span className="flex min-w-0 flex-col px-0.5">
                <span id={`${id}-${rascunho.id}-nome`} className="truncate text-sm">
                  {rascunho.nome}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-xs text-muted-foreground">{rascunho.dia}</span>
                  {rascunho.ficha ? (
                    <span className="truncate text-xs text-muted-foreground">
                      <DesfechoMark desfecho={rascunho.desfecho ?? 'explorando'} />
                    </span>
                  ) : null}
                </span>
              </span>
            </TabLink>
          </li>
        ))}
      </ul>
    </HomeCard>
  );
}

function RecentNotesBlock() {
  const { notas, local, setNote } = useProjectPage();
  const recent = notas.slice(0, 3);
  if (recent.length === 0) return null;
  return (
    <HomeCard
      title="Notas"
      titleId="projeto-notas"
      meta={
        <TabLink tab="notas" className={QUIET_META}>
          Ver todas
        </TabLink>
      }
    >
      <ul aria-label="Notas recentes" className="flex flex-col gap-0.5">
        {recent.map(nota => (
          <li key={nota.nome}>
            <TabLink
              tab="notas"
              onClick={() => (local ? setNote(nota.nome) : handNoteOver(nota.nome))}
              className="flex min-h-11 w-full min-w-0 cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors duration-150 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none"
            >
              <span className="min-w-0 flex-1 truncate text-sm">{nota.titulo}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{nota.editada}</span>
            </TabLink>
          </li>
        ))}
      </ul>
    </HomeCard>
  );
}

/** The servers listening in the project's folder, one per port: the port, the command and a link that opens it in a new tab. */
function ServersBlock() {
  const { data } = useProjectPage();
  if (data.servers.length === 0) return null;
  return (
    <HomeCard title="Servidores ligados" titleId="projeto-servidores">
      <ul aria-label="Servidores ligados" className="flex flex-col divide-y">
        {data.servers.map(server => (
          <li key={server.porta} aria-label={`Porta ${server.porta}`} className="flex min-w-0 items-center gap-3 py-2.5 pr-4">
            <span aria-hidden className="-mr-3 flex w-(--axis) shrink-0 justify-center">
              <span className="size-1.5 rounded-full bg-success" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="font-mono text-sm tabular-nums">{server.porta}</span>
              <span title={server.comando} className="truncate font-mono text-xs text-muted-foreground">
                {[server.comando, server.onde].filter(Boolean).join(' · ')}
              </span>
            </span>
            {server.url ? (
              <a href={server.url} target="_blank" rel="noreferrer" aria-label={`Abrir a porta ${server.porta} numa aba nova`} className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                Abrir
                <ArrowUpRight aria-hidden className="size-3.5" />
              </a>
            ) : (
              <span className="shrink-0 text-xs text-muted-foreground">Só no servidor</span>
            )}
          </li>
        ))}
      </ul>
    </HomeCard>
  );
}

/** Where the project's issues, triage labels and domain docs live, in one line, or "Não configurado"; the button starts a session with the setup skill. */
function EngineeringSkillsBlock() {
  const { data } = useProjectPage();
  const navigate = useNavigate();
  return (
    <HomeCard
      title="Skills de engenharia"
      titleId="projeto-skills"
      meta={
        <Button variant="outline" size="xs" onClick={() => navigate('Sessão/Sessão')}>
          {data.skills ? 'Mudar' : 'Configurar'}
        </Button>
      }
    >
      <div className="flex flex-col gap-1 py-3 pl-(--axis) text-sm">
        {data.skills ? (
          <p>{data.skills}</p>
        ) : (
          <>
            <p>Não configurado</p>
            <p className="text-muted-foreground">As skills de specs, tickets e triagem ainda não sabem onde ficam as issues deste projeto.</p>
          </>
        )}
      </div>
    </HomeCard>
  );
}

const SHOWN = 5;
const MORE_STEP = 10;

function RecentSessionsBlock() {
  const { data } = useProjectPage();
  const [limit, setLimit] = useState(SHOWN);
  const rest = data.sessions.filter(session => !session.working && !session.waiting);
  const shown = rest.slice(0, limit);
  const remaining = rest.length - shown.length;
  if (rest.length === 0) return null;
  return (
    <HomeCard title="Sessões recentes" titleId="projeto-sessoes-recentes">
      <ul aria-label="Sessões recentes do projeto" className="flex flex-col divide-y">
        {shown.map(session => (
          <SessionRow key={session.id} session={session} seal={data.project.seal} />
        ))}
      </ul>
      {remaining > 0 || limit > SHOWN ? (
        <div className="flex gap-3 border-t py-2 pr-4 pl-(--axis) text-sm text-muted-foreground">
          {remaining > 0 ? (
            <button type="button" className="cursor-pointer hover:text-foreground" onClick={() => setLimit(current => current + MORE_STEP)}>
              Mais {remaining}
            </button>
          ) : null}
          {limit > SHOWN ? (
            <button type="button" className="cursor-pointer hover:text-foreground" onClick={() => setLimit(SHOWN)}>
              Mostrar menos
            </button>
          ) : null}
        </div>
      ) : null}
    </HomeCard>
  );
}

/**
 * The overview. While the project list loads, only the header (with the folder's name) and the field show; when the
 * plugin's folder routes fail, the board, drafts, notes and skills blocks are gone and the rest stays.
 */
export function Overview() {
  const { status } = useProjectPage();
  const loaded = status !== 'carregando';
  const plugin = status === 'pronto';
  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <ProjectHeader />
      <div className="relative z-20 flex flex-col gap-2">
        <Composer label="O que o agente deve fazer?" placeholder="O que o agente deve fazer?" />
      </div>
      {loaded ? <InProgressBlock /> : null}
      {plugin ? <WaitingCardsBlock /> : null}
      {plugin ? <RecentDraftsBlock /> : null}
      {plugin ? <RecentNotesBlock /> : null}
      {loaded ? <ServersBlock /> : null}
      {plugin ? <EngineeringSkillsBlock /> : null}
      {loaded ? <RecentSessionsBlock /> : null}
    </div>
  );
}
