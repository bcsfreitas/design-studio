// A session page as eru draws it on a wide screen (features/sessions/SessionPage.tsx and SessionHeader.tsx): the bar with
// the project and the session, the history on the thread, the cards that wait for an answer, the docked message field and
// the rail with its panels. Every state of the page is a `variant`; answering, sending and stopping work locally.
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { ErrorState } from '@/systems/eru/components/error-state';
import { SealIcon } from '@/systems/eru/components/seal-icon';
import { Skeleton } from '@/systems/eru/components/skeleton';
import { ChevronDown, GitBranch, Server } from '@/systems/eru/libraries/icons';
import {
  APPROVAL_REQUEST,
  APPROVAL_STEP,
  FINISHED_TURNS,
  INTERRUPTED_TURNS,
  QUESTION_STEP,
  QUESTIONS,
  RUNNING_STEP,
  SESSION,
  SESSION_CONTEXT,
  SESSION_PROJECT,
  SESSION_USAGE,
  SUBAGENTS,
  liveTurn,
  type AssistantEntry,
  type TranscriptEntry,
  type TrailStep,
} from '../data/session';
import AppShell, { PageBar } from '../shell/AppShell';
import { ApprovalCard, ClarifyCard, type ApprovalChoice } from './Cards';
import { Composer } from './Composer';
import { AgentsPanel, BrowserPanel, FilesPanel, TerminalPanel, type OpenFiles } from './Panels';
import { PanelCard, RAIL_PANELS, Rail, type PanelId } from './Rail';
import styles from './session.module.css';
import { AwaitingAnswerContext, TrailToolsContext } from './Trail';
import { Transcript } from './Transcript';

export type SessionVariant = 'finished' | 'live' | 'approval' | 'question' | 'interrupted' | 'loading' | 'error';

type Part = 'sessao' | 'branch' | 'alteracoes' | 'servidores';

type Phase = 'idle' | 'running' | 'approval' | 'question' | 'loading' | 'error';

function Diffstat({ added, removed }: { added: number; removed: number }) {
  return (
    <span className="shrink-0 font-mono text-xs tabular-nums">
      <span className="text-success-foreground">+{added}</span> <span className="text-destructive-foreground">−{removed}</span>
      <span className="sr-only">
        {' '}
        ({added} linhas adicionadas, {removed} removidas)
      </span>
    </span>
  );
}

/**
 * The session bar, on one line: on the left, a button with the project seal and "Projeto / Sessão"; on the right, the
 * context in buttons (branch, +/− and the servers that are on), each one opening its part of the project panel.
 */
export function SessionBar({ title, active, context = true }: { title: string | null; active: boolean; context?: boolean }) {
  const [part, setPart] = useState<Part | null>(null);
  const toggle = (next: Part) => setPart(current => (current === next ? null : next));
  const item = (id: Part, children: ReactNode) => (
    <button type="button" data-parte={id} aria-haspopup="dialog" aria-expanded={part === id} onClick={() => toggle(id)} className={styles.ctxItem}>
      {children}
    </button>
  );

  return (
    <PageBar
      title={
        title === null ? (
          <Skeleton className="h-4 w-48" />
        ) : (
          <button type="button" data-parte="sessao" aria-haspopup="dialog" aria-expanded={part === 'sessao'} onClick={() => toggle('sessao')} className={styles.title}>
            <SealIcon seal={SESSION_PROJECT.seal} size={24} working={active} className="mr-[3px]" />
            <span className={styles.proj}>{SESSION_PROJECT.label}</span>
            <span aria-hidden className={styles.sep}>
              /
            </span>
            <span className={styles.name}>{title}</span>
            <ChevronDown aria-hidden className={styles.chevron} />
          </button>
        )
      }
      titleClassName={title === null ? undefined : styles.heading}
      context={
        context ? (
          <nav aria-label="O projeto desta sessão" className={styles.ctx}>
            {item(
              'branch',
              <>
                <GitBranch aria-hidden />
                <span className="truncate">{SESSION_CONTEXT.branch}</span>
              </>,
            )}
            {item('alteracoes', <Diffstat added={SESSION_CONTEXT.added} removed={SESSION_CONTEXT.removed} />)}
            {item(
              'servidores',
              <>
                <Server aria-hidden />
                {SESSION_CONTEXT.servers} {SESSION_CONTEXT.servers === 1 ? 'ligado' : 'ligados'}
              </>,
            )}
          </nav>
        ) : null
      }
      contextClassName={styles.ctxSlot}
    />
  );
}

const thinking = (): TrailStep => ({ kind: 'step', key: `pensando-${Date.now()}`, label: 'Pensando', icon: 'reasoning', state: 'running', touches: [], tools: [], reasoning: [] });

function initialEntries(variant: SessionVariant): TranscriptEntry[] {
  switch (variant) {
    case 'live':
      return liveTurn(RUNNING_STEP);
    case 'approval':
      return liveTurn(APPROVAL_STEP);
    case 'question':
      return liveTurn(QUESTION_STEP);
    case 'interrupted':
      return INTERRUPTED_TURNS;
    case 'loading':
    case 'error':
      return [];
    default:
      return FINISHED_TURNS;
  }
}

function initialPhase(variant: SessionVariant): Phase {
  switch (variant) {
    case 'live':
      return 'running';
    case 'approval':
      return 'approval';
    case 'question':
      return 'question';
    case 'loading':
      return 'loading';
    case 'error':
      return 'error';
    default:
      return 'idle';
  }
}

/** Replaces the running step of the live turn with what came of it, and lets the agent think again. */
function settleLast(entries: TranscriptEntry[], change: Partial<TrailStep>): TranscriptEntry[] {
  return entries.map(entry => {
    if (entry.kind !== 'assistant' || entry.status !== 'running') return entry;
    const items = entry.items.map((item, index) => (index === entry.items.length - 1 && item.kind === 'step' ? { ...item, state: 'done' as const, ...change } : item));
    return { ...entry, items: [...items, thinking()] };
  });
}

function stop(entries: TranscriptEntry[], seconds: number): TranscriptEntry[] {
  return entries.map(entry => {
    if (entry.kind !== 'assistant' || entry.status !== 'running') return entry;
    const items = entry.items.filter(item => !(item.kind === 'step' && item.state === 'running'));
    return { ...entry, status: 'interrupted', items, took: seconds, endTime: '16:55', watched: true } satisfies AssistantEntry;
  });
}

export interface SessionScreenProps {
  variant?: SessionVariant;
  /** The rail panel open when the page appears. */
  panel?: PanelId | null;
}

export function SessionScreen({ variant = 'finished', panel: initialPanel = null }: SessionScreenProps) {
  const [entries, setEntries] = useState(() => initialEntries(variant));
  const [phase, setPhase] = useState<Phase>(() => initialPhase(variant));
  const [liveSince, setLiveSince] = useState(() => Date.now() - 154_000);
  const [panel, setPanel] = useState<PanelId | null>(initialPanel);
  const [files, setFiles] = useState<OpenFiles>(() => (initialPanel === 'arquivos' ? { files: ['/home/hermes/projects/endless-harness/src/prototypes/bernardo/eru/_components/shell/AppShell.tsx'], active: null } : { files: [], active: null }));
  const scroller = useRef<HTMLDivElement>(null);
  const active = phase === 'running' || phase === 'approval' || phase === 'question';
  const awaiting = phase === 'approval' || phase === 'question';
  const loaded = phase !== 'loading' && phase !== 'error';
  const title = phase === 'loading' ? null : phase === 'error' ? 'Sessão' : SESSION.title;
  const running = SUBAGENTS.filter(subagent => subagent.status === 'running').length;
  const shown = RAIL_PANELS.find(entry => entry.id === panel) ?? null;

  useLayoutEffect(() => {
    const node = scroller.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [entries.length, phase]);

  const answerApproval = (choice: ApprovalChoice) => {
    const decision = choice === 'deny' ? 'denied' : 'approved';
    setEntries(current => settleLast(current, { label: 'Pediu aprovação', decision, duration: 9 }));
    setPhase('running');
  };

  const answerQuestion = () => {
    setEntries(current => settleLast(current, { label: 'Fez 2 perguntas', duration: 21 }));
    setPhase('running');
  };

  const send = (text: string) => {
    setLiveSince(Date.now());
    setEntries(current => [...current, { kind: 'user', key: `ask-${Date.now()}`, text, time: '16:52' }, { kind: 'assistant', key: `reply-${Date.now()}`, status: 'running', items: [thinking()] }]);
    setPhase('running');
  };

  const retry = () => {
    setPhase('loading');
    window.setTimeout(() => {
      setEntries(FINISHED_TURNS);
      setPhase('idle');
    }, 900);
  };

  return (
    <TrailToolsContext
      value={{
        openFile: path => {
          setFiles(current => ({ files: current.files.includes(path) ? current.files : [...current.files, path], active: path }));
          setPanel('arquivos');
        },
        openPanel: id => setPanel(id as PanelId),
      }}
    >
      <AppShell
        current="sessoes"
        sky={{ seal: SESSION_PROJECT.seal }}
        bar={<SessionBar title={title} active={active} context={loaded} />}
        fill
        rail={<Rail openId={panel} running={running} onToggle={id => setPanel(current => (current === id ? null : id))} />}
        side={
          shown ? (
            <PanelCard panel={shown} onClose={() => setPanel(null)}>
              {shown.id === 'navegador' ? <BrowserPanel /> : shown.id === 'terminal' ? <TerminalPanel /> : shown.id === 'arquivos' ? <FilesPanel open={files} onChange={setFiles} /> : <AgentsPanel />}
            </PanelCard>
          ) : null
        }
      >
        <div ref={scroller} className="quiet-scroll flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
          <section data-sky-column className="session-column flex w-full max-w-180 flex-1 flex-col gap-4 px-4 pt-4 sm:px-6 sm:pt-6 md:max-w-[min(45rem,calc(100%_-_6rem))]">
            <div className="mt-auto flex flex-col gap-4">
              {phase === 'error' ? (
                <ErrorState title="Não foi possível carregar o histórico da sessão." onRetry={retry} />
              ) : phase === 'loading' ? (
                <div className="flex flex-col gap-4" aria-hidden>
                  <Skeleton className="ml-auto h-10 w-1/2 rounded-2xl" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : entries.length > 0 ? (
                <AwaitingAnswerContext value={awaiting}>
                  <Transcript entries={entries} liveSince={liveSince} />
                </AwaitingAnswerContext>
              ) : (
                <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Esta sessão ainda não tem mensagens.</p>
              )}
              {phase === 'question' ? (
                <div className="px-4">
                  <ClarifyCard questions={QUESTIONS} onSubmit={answerQuestion} onSkip={answerQuestion} />
                </div>
              ) : null}
              {phase === 'approval' ? (
                <div className="px-4">
                  <ApprovalCard request={APPROVAL_REQUEST} onAnswer={answerApproval} />
                </div>
              ) : null}
            </div>
            <div className="composer-dock sticky bottom-0 isolate pt-2 pb-4 sm:pb-6">
              <Composer
                active={active}
                usage={SESSION_USAGE}
                onSend={send}
                onInterrupt={() => {
                  setEntries(current => stop(current, Math.max(1, Math.round((Date.now() - liveSince) / 1000))));
                  setPhase('idle');
                }}
              />
            </div>
          </section>
        </div>
      </AppShell>
    </TrailToolsContext>
  );
}
