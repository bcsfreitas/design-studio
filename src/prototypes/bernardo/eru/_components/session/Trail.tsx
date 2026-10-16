// The agent's turn on the thread, ported from eru features/transcript (Trail.tsx, TrailAgents.tsx, AgentTrace.tsx, ToolDetails.tsx).
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { cn } from '#studio/runtime';
import { CodeBlock } from '@/systems/eru/components/code-block';
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from '@/systems/eru/components/collapsible';
import { Orbiter } from '@/systems/eru/components/orbiter';
import { Shine } from '@/systems/eru/components/shine';
import {
  Activity,
  AppWindow,
  BookOpen,
  Brain,
  ChevronDown,
  ChevronRight,
  CodeXml,
  FilePen,
  FileText,
  Globe,
  MessageCircleQuestionMark,
  MousePointerClick,
  Navigation,
  NotebookPen,
  ShieldCheck,
  ShieldX,
  Sparkle,
  SquareTerminal,
  TextSearch,
  TriangleAlert,
  Users,
  Wrench,
  X,
  type LucideIcon,
} from '@/systems/eru/libraries/icons';
import type { AssistantEntry, StepIcon, TaskState, Tool, ToolKind, Touch, TrailBranch, TrailItem, TrailStep, TrailTask } from '../data/session';

export const KIND_ICONS: Record<ToolKind, LucideIcon> = {
  terminal: SquareTerminal,
  code: CodeXml,
  read: FileText,
  edit: FilePen,
  search: TextSearch,
  web: Globe,
  page: AppWindow,
  browser: MousePointerClick,
  delegate: Users,
  skill: BookOpen,
  memory: NotebookPen,
  question: MessageCircleQuestionMark,
  other: Wrench,
};

const PROCESS_ICON = Activity;
const STEP_ICONS: Record<StepIcon, LucideIcon> = { ...KIND_ICONS, reasoning: Brain, approved: ShieldCheck, denied: ShieldX };
const TOUCH_ICONS: Record<Touch['kind'], LucideIcon> = { file: FileText, search: TextSearch, page: Globe };
const MAX_CHIPS = 4;
const MAX_LANES = 3;

/** What the trail can ask of the page around it: open a file in the Arquivos panel, a subagent in Agentes, or a panel. */
export interface TrailTools {
  openFile: (path: string) => void;
  openPanel: (id: string) => void;
}

export const TrailToolsContext = createContext<TrailTools | null>(null);

/** The agent waits for the user's answer (an approval or a question): the live head says so and stops the clock. */
export const AwaitingAnswerContext = createContext(false);

function took(seconds: number) {
  return seconds < 60 ? `${seconds} s` : `${Math.round(seconds / 60)} min`;
}

function stepTime(seconds: number) {
  const whole = Math.round(seconds);
  return whole < 60 ? `${whole} s` : `${Math.floor(whole / 60)} min${whole % 60 >= 10 ? ` ${whole % 60} s` : ''}`;
}

function clock(seconds: number) {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

export const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

function Elapsed({ since }: { since: number }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <span aria-hidden className="trail-clock">
      {clock((now - since) / 1000)}
    </span>
  );
}

function Chips({ touches }: { touches: Touch[] }) {
  const tools = useContext(TrailToolsContext);
  const shown = touches.slice(0, MAX_CHIPS);

  return (
    <ul aria-label="O que o passo tocou" className="trail-chips">
      {shown.map(touch => {
        const Icon = TOUCH_ICONS[touch.kind];
        const content = (
          <>
            <Icon aria-hidden className="size-2.75 shrink-0" />
            <span className="truncate">{touch.label}</span>
          </>
        );
        return (
          <li key={`${touch.kind}-${touch.path ?? touch.label}`} className="min-w-0">
            {touch.path && tools ? (
              <button type="button" className="trail-chip" title={touch.path} aria-label={`Abrir ${touch.label} no painel Arquivos`} onClick={() => tools.openFile(touch.path!)}>
                {content}
              </button>
            ) : (
              <span className="trail-chip" title={touch.path}>
                {content}
              </span>
            )}
          </li>
        );
      })}
      {touches.length > shown.length ? (
        <li>
          <span className="trail-chip is-more" aria-label={`Mais ${touches.length - shown.length}`}>
            +{touches.length - shown.length}
          </span>
        </li>
      ) : null}
    </ul>
  );
}

const SCRIPTS: Record<string, { field: string; title: string; language: string }> = {
  terminal: { field: 'command', title: 'Comando', language: 'bash' },
  execute_code: { field: 'code', title: 'Código', language: 'python' },
};

function readableResult(raw: string): { text: string; language?: string } {
  try {
    const fields = JSON.parse(raw) as Record<string, unknown>;
    for (const [field, language] of [['diff', 'diff'], ['output', undefined], ['content', undefined], ['error', undefined]] as const) {
      if (typeof fields[field] === 'string' && fields[field]) return { text: fields[field] as string, language };
    }
  } catch {
    return { text: raw };
  }
  return { text: raw };
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-[11px] font-medium text-muted-foreground">{title}</span>
      {children}
    </div>
  );
}

function Plain({ children }: { children: string }) {
  return <pre className="max-h-64 overflow-auto rounded-lg border bg-muted/40 p-2.5 font-mono text-[11px] leading-relaxed break-words whitespace-pre-wrap">{children}</pre>;
}

/** What the tool received and returned: the command as a code block, the rest in readable pairs. */
export function ToolDetails({ tool }: { tool: Tool }) {
  const args = tool.args ?? {};
  const script = SCRIPTS[tool.name];
  const code = script && typeof args[script.field] === 'string' ? (args[script.field] as string) : null;
  const diff = tool.name === 'patch' && typeof args.old_string === 'string' && typeof args.new_string === 'string' ? `-${args.old_string}\n+${args.new_string}` : null;
  const hidden = new Set([...(code === null ? [] : [script.field]), ...(diff === null ? [] : ['old_string', 'new_string'])]);
  const rest = Object.entries(args).filter(([name]) => !hidden.has(name));
  const result = tool.result === undefined ? null : readableResult(tool.result);

  return (
    <div className="flex min-w-0 flex-col gap-2.5 pt-1 pr-1.5 pb-2.5 pl-6.5 text-xs">
      {code !== null ? (
        <Section title={script.title}>
          <CodeBlock code={code} language={script.language} className="max-h-64 p-2.5 text-[11px] break-all whitespace-pre-wrap" />
        </Section>
      ) : null}
      {diff !== null ? (
        <Section title="Alteração">
          <CodeBlock code={diff} language="diff" className="max-h-64 p-2.5 text-[11px]" />
        </Section>
      ) : null}
      {rest.length > 0 ? (
        <Section title={code === null && diff === null ? 'Argumentos' : 'Outros argumentos'}>
          <dl className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 rounded-lg border bg-muted/40 p-2.5 font-mono text-[11px] leading-relaxed">
            {rest.map(([name, value]) => (
              <div key={name} className="contents">
                <dt className="text-muted-foreground">{name}</dt>
                <dd className="max-h-40 min-w-0 overflow-auto break-words whitespace-pre-wrap">{typeof value === 'string' ? value : JSON.stringify(value, null, 2)}</dd>
              </div>
            ))}
          </dl>
        </Section>
      ) : null}
      <Section title={script ? 'Saída' : 'Resultado'}>
        {result === null ? (
          <p className="text-muted-foreground">{tool.running ? 'Aguardando o resultado…' : 'Sem resultado.'}</p>
        ) : result.language ? (
          <CodeBlock code={result.text} language={result.language} className="max-h-64 p-2.5 text-[11px]" />
        ) : (
          <Plain>{result.text || '(vazio)'}</Plain>
        )}
      </Section>
    </div>
  );
}

function ToolRow({ tool }: { tool: Tool }) {
  const Icon = KIND_ICONS[tool.icon] ?? PROCESS_ICON;
  const running = tool.running === true;

  return (
    <Collapsible render={<li className="trace-row-in min-w-0" aria-label={tool.label} />}>
      <CollapsibleTrigger className="trace-step group/step flex min-h-7 w-full min-w-0 cursor-pointer items-center gap-2 rounded-md px-1.5 py-0.5 text-left text-xs transition-colors duration-150 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none data-panel-open:bg-muted/60 motion-reduce:transition-none">
        {running ? (
          <span className="trace-step-icon mx-px size-3 shrink-0 rounded-full border-[1.5px] border-border border-t-muted-foreground motion-safe:animate-spin" aria-hidden />
        ) : (
          <Icon className="trace-step-icon size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        )}
        <span className={cn('min-w-0 truncate', running ? 'text-foreground' : 'text-foreground/85')}>{tool.label}</span>
        <ChevronRight aria-hidden className="size-3 shrink-0 text-muted-foreground/50 transition-transform duration-200 group-hover/step:text-muted-foreground group-data-panel-open/step:rotate-90 motion-reduce:transition-none" />
      </CollapsibleTrigger>
      <CollapsiblePanel className="duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]">
        <ToolDetails tool={tool} />
      </CollapsiblePanel>
    </Collapsible>
  );
}

const OUTCOME = { approved: 'Você aprovou. O comando rodou.', denied: 'Você recusou. O comando não rodou.' };

function StepDetail({ step }: { step: TrailStep }) {
  if (step.reasoning !== undefined) {
    return (
      <div className="trail-detail-text">
        {step.reasoning.map((text, index) => (
          <p key={index}>{text}</p>
        ))}
      </div>
    );
  }

  if (step.tools.length > 1) {
    return (
      <ol aria-label={step.label} className="mt-0.5 mb-1 ml-3.5 flex flex-col gap-0.5 border-l border-border/70 pl-2">
        {step.tools.map(tool => (
          <ToolRow key={tool.id} tool={tool} />
        ))}
      </ol>
    );
  }

  const tool = step.tools[0];

  if (!tool) {
    return <p className="pt-1 pr-1.5 pb-2.5 pl-6.5 text-xs text-muted-foreground">Sem detalhes.</p>;
  }

  return (
    <>
      {step.decision ? (
        <p role="note" aria-label="Decisão" className="pt-1 pr-1.5 pl-6.5 text-xs text-foreground/85">
          {OUTCOME[step.decision]}
        </p>
      ) : null}
      <ToolDetails tool={tool} />
    </>
  );
}

type Below = 'main' | 'error' | null;

interface Thread {
  below: Below;
  first: boolean;
}

function threadProps({ below, first }: Thread) {
  return { 'data-below': below ?? undefined, 'data-first': first ? '' : undefined };
}

function StepTime({ step }: { step: TrailStep }) {
  return step.state !== 'running' && step.duration !== undefined && step.duration >= 1 ? <span className="trail-time">{stepTime(step.duration)}</span> : null;
}

function StepText({ step }: { step: TrailStep }) {
  const running = step.state === 'running';

  return (
    <span className="trail-text">
      {running ? <Shine text={step.label} /> : <span className="trail-label">{step.label}</span>}
      {running ? <span className="sr-only">em andamento</span> : null}
    </span>
  );
}

function StepNode({ step }: { step: TrailStep }) {
  const Icon = step.state === 'failed' ? X : STEP_ICONS[step.decision ?? step.icon];

  return <span className="trail-node">{step.state === 'running' ? <Orbiter className="size-4" /> : <Icon aria-hidden className="size-3.5" />}</span>;
}

function Step({ step, thread }: { step: TrailStep; thread: Thread }) {
  return (
    <Collapsible render={<li className="trail-step" data-state={step.state} aria-label={step.label} {...threadProps(thread)} />}>
      <CollapsibleTrigger className="trail-row group/step">
        <StepNode step={step} />
        <StepText step={step} />
        <StepTime step={step} />
      </CollapsibleTrigger>
      {step.touches.length > 0 ? <Chips touches={step.touches} /> : null}
      <CollapsiblePanel className="trail-detail">
        <StepDetail step={step} />
      </CollapsiblePanel>
    </Collapsible>
  );
}

function SubStep({ step }: { step: TrailStep }) {
  return (
    <Collapsible render={<li className="trail-sub" data-state={step.state} aria-label={step.label} />}>
      <CollapsibleTrigger className="trail-sub-row">
        {step.state === 'failed' ? (
          <span aria-hidden className="trail-sub-mark">
            <X className="size-2.75" />
          </span>
        ) : (
          <span aria-hidden className="trail-sub-dot" />
        )}
        <StepText step={step} />
        <StepTime step={step} />
      </CollapsibleTrigger>
      {step.touches.length > 0 ? <Chips touches={step.touches} /> : null}
      <CollapsiblePanel className="trail-detail">
        <StepDetail step={step} />
      </CollapsiblePanel>
    </Collapsible>
  );
}

const STATE_WORDS: Record<TaskState, string> = { running: 'trabalhando', completed: 'pronto', failed: 'falhou', interrupted: 'interrompido', ended: 'encerrado' };

const STATUS_DOT: Record<TaskState, string> = {
  running: 'bg-success',
  completed: 'bg-muted-foreground',
  failed: 'bg-destructive',
  interrupted: 'bg-warning',
  ended: 'bg-muted-foreground/50',
};

export function StatusDot({ status, className }: { status: TaskState; className?: string }) {
  return <span aria-hidden data-estado={status} className={cn('size-1.5 shrink-0 rounded-full', STATUS_DOT[status], className)} />;
}

function oneLine(text: string, max: number) {
  const line = text.replace(/\s+/g, ' ').trim();
  return line.length > max ? `${line.slice(0, max - 1).trimEnd()}…` : line;
}

export const goalTitle = (goal: string) => oneLine(goal.split('\n')[0] ?? goal, 60) || 'Subagente';

function laneTitle(goal: string) {
  const title = goalTitle(goal);
  const lower = title.length > 1 && title[1] === title[1].toLowerCase() ? title[0].toLowerCase() + title.slice(1) : title;
  return `Subagente: ${lower}`;
}

function AgentTasks({ tasks }: { tasks: TrailTask[] }) {
  const tools = useContext(TrailToolsContext);
  const extra = tasks.length - MAX_LANES;
  const more = extra === 1 ? '+1 subagente' : `+${extra} subagentes`;

  return (
    <ol className="trail-subs" aria-label="Subagentes">
      {tasks.slice(0, MAX_LANES).map(task => {
        const title = laneTitle(task.goal);
        const content = (
          <>
            <span aria-hidden className="trail-sub-dot" />
            <span className="trail-agent-text">
              <span className="trail-agent-goal">{title}</span>
              {task.activity ? <small>{task.activity}</small> : null}
            </span>
            <span className="trail-agent-state">
              <StatusDot status={task.state} />
              {STATE_WORDS[task.state]}
            </span>
          </>
        );
        return (
          <li key={task.key} className="trail-sub is-agent" data-state={task.state === 'running' ? 'running' : 'done'} aria-label={`${title}, ${STATE_WORDS[task.state]}`}>
            {tools ? (
              <button type="button" className="trail-agent" title={task.goal} onClick={() => tools.openPanel('agentes')}>
                {content}
              </button>
            ) : (
              <div className="trail-agent" title={task.goal}>
                {content}
              </div>
            )}
          </li>
        );
      })}
      {extra > 0 ? (
        <li className="trail-sub is-more">
          {tools ? (
            <button type="button" className="trail-agent-more" aria-label={`${more}: abrir o painel Agentes`} onClick={() => tools.openPanel('agentes')}>
              {more}
            </button>
          ) : (
            <span className="trail-agent-more">{more}</span>
          )}
        </li>
      ) : null}
    </ol>
  );
}

const BRANCH_NAMES: Record<TrailBranch['branch'], string> = { parallel: 'Ao mesmo tempo', error: 'Subtarefa que falhou', agents: 'Subagentes' };

function Branch({ branch, joined }: { branch: TrailBranch; joined: boolean }) {
  return (
    <li className="trail-branch" data-branch={branch.branch} data-joined={joined ? '' : undefined} aria-label={BRANCH_NAMES[branch.branch]}>
      {branch.branch === 'error' ? (
        <svg aria-hidden className="trail-lane is-dotted">
          <path />
        </svg>
      ) : (
        <span aria-hidden className="trail-lane" />
      )}
      {joined && branch.branch !== 'error' ? <span aria-hidden className="trail-lane-close" /> : null}
      {branch.branch === 'agents' ? (
        <AgentTasks tasks={branch.tasks} />
      ) : (
        <ol className="trail-subs" aria-label={BRANCH_NAMES[branch.branch]}>
          {branch.steps.map(step => (
            <SubStep key={step.key} step={step} />
          ))}
        </ol>
      )}
    </li>
  );
}

function Steer({ text, thread }: { text: string; thread: Thread }) {
  const label = `Você: ${text}`;

  return (
    <li className="trail-step is-steer" aria-label={label} {...threadProps(thread)}>
      <div className="trail-row">
        <span className="trail-node">
          <Navigation aria-hidden className="size-3.5" />
        </span>
        <span className="trail-text">
          <span className="trail-label">{label}</span>
        </span>
      </div>
    </li>
  );
}

function threadSeams(items: TrailItem[], { ending, closed }: { ending: boolean; closed: boolean }) {
  const after = (index: number) => index < items.length - 1 || ending;

  return items.map((item, index) => {
    if (item.kind === 'branch') return { below: null as Below, joined: closed || after(index) };
    if (!after(index)) return { below: null as Below, joined: false };
    const next = items[index + 1];
    const attempt = next?.kind === 'branch' && next.branch === 'error' && !closed && !after(index + 1);
    return { below: (attempt ? 'error' : 'main') as Below, joined: false };
  });
}

function countSteps(items: TrailItem[]) {
  return items.reduce((total, item) => total + (item.kind === 'step' ? 1 : item.kind === 'branch' ? (item.branch === 'agents' ? 1 : item.steps.length) : 0), 0);
}

function headerTitle(entry: AssistantEntry, steps: number, seconds: number | null) {
  const count = steps > 0 ? ` · ${plural(steps, 'passo', 'passos')}` : '';
  if (entry.status === 'interrupted') return seconds === null ? `Interrompido${count}` : `Interrompido depois de ${took(seconds)}${count}`;
  if (entry.status === 'error') return seconds === null ? `Parou num erro${count}` : `Parou num erro depois de ${took(seconds)}${count}`;
  return seconds === null ? plural(steps, 'passo', 'passos') : `Trabalhou ${took(seconds)}${count}`;
}

/**
 * The agent's turn on the thread: the head ("Trabalhando" with the clock running, then "Trabalhou 42 s · 6 passos" and the end
 * time), the steps and the agent's text in the order they happened. Closed, the trail hides only the steps.
 */
export function Trail({ entry, startedAt, threaded, renderText }: { entry: AssistantEntry; startedAt?: number; threaded: boolean; renderText: (text: string) => ReactNode }) {
  const live = entry.status === 'running';
  const awaiting = useContext(AwaitingAnswerContext);
  const items = entry.items;
  const steps = countSteps(items);
  const [manual, setManual] = useState<boolean | null>(null);
  const open = live || (manual ?? entry.watched === true);
  const shown = open ? items : items.filter(item => item.kind !== 'step' && item.kind !== 'branch');
  const note = entry.status === 'interrupted' ? 'Turno interrompido.' : null;
  const seams = threadSeams(shown, { ending: note !== null, closed: !live });
  const seconds = entry.took ?? null;
  const header = live || steps > 0 || seconds !== null;
  const last = shown.at(-1);
  const ended = !live && note === null && last?.kind === 'text';
  const thread = (index: number): Thread => ({ below: seams[index].below, first: !header && index === 0 && !threaded });

  return (
    <div className="trail" data-open={open ? '' : undefined}>
      {header ? (
        live ? (
          <p role="status" className="trail-head is-live" {...threadProps({ below: shown.length > 0 ? 'main' : null, first: !threaded })}>
            <span className="trail-node">
              <Orbiter className="size-4" />
            </span>
            <span className="trail-title">{awaiting ? 'Esperando sua resposta' : 'Trabalhando'}</span>
            {startedAt !== undefined && !awaiting ? <Elapsed since={startedAt} /> : null}
          </p>
        ) : (
          <button
            type="button"
            aria-expanded={steps > 0 ? open : undefined}
            disabled={steps === 0}
            onClick={() => setManual(!open)}
            className="trail-head group/head"
            {...threadProps({ below: shown.length > 0 || note ? 'main' : null, first: !threaded })}
          >
            <span className="trail-node">
              <Sparkle aria-hidden className="size-3.5" />
            </span>
            <span className="trail-title">{headerTitle(entry, steps, seconds)}</span>
            {entry.endTime ? <time className="trail-end">{entry.endTime}</time> : null}
            {steps > 0 ? <ChevronDown aria-hidden className="trail-chevron" /> : null}
          </button>
        )
      ) : null}
      {shown.length > 0 ? (
        <ol aria-label="Rastro do agente" className="trail-items">
          {shown.map((item, index) =>
            item.kind === 'step' ? (
              <Step key={item.key} step={item} thread={thread(index)} />
            ) : item.kind === 'branch' ? (
              <Branch key={item.key} branch={item} joined={seams[index].joined} />
            ) : item.kind === 'steer' ? (
              <Steer key={item.key} text={item.text} thread={thread(index)} />
            ) : item.kind === 'notice' ? (
              <li key={item.key} className="trail-prose is-notice" {...threadProps(thread(index))}>
                <p className="on-axis flex items-center gap-2 text-xs text-foreground">
                  <TriangleAlert className="size-3.5 shrink-0 text-warning" aria-hidden />
                  {item.text}
                </p>
              </li>
            ) : (
              <li key={item.key} className={cn('trail-prose', ended && index === shown.length - 1 && 'is-end')} {...threadProps(thread(index))}>
                {renderText(item.text)}
              </li>
            ),
          )}
        </ol>
      ) : null}
      {note ? <p className="trail-note is-end">{note}</p> : null}
    </div>
  );
}

export function WorkingLabel({ text, className }: { text: string; className?: string }) {
  return <span className={cn('thinking-label whitespace-nowrap', className)}>{text}</span>;
}
