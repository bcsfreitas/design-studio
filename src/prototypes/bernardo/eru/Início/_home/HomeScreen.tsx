// Início, ported from eru features/home/HomePage.tsx: the greeting and the day's summary, the field to start a session, the
// sessions in progress, Todoist's tasks and the recent sessions, with the astrolabe and its medallions on the right. The
// data comes in as props so each state renders the same screen with its own data.
import { useEffect, useRef, useState, type FocusEvent, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from '@module/prototypes';
import { cn } from '#studio/runtime';
import { Button } from '@/systems/eru/components/button';
import { Diamond } from '@/systems/eru/components/diamond';
import { ErrorState } from '@/systems/eru/components/error-state';
import { Input } from '@/systems/eru/components/input';
import { Label } from '@/systems/eru/components/label';
import { LoadingState } from '@/systems/eru/components/loading-state';
import { Menu, MenuGroup, MenuGroupLabel, MenuItem, MenuPopup, MenuRadioGroup, MenuRadioItem, MenuSeparator, MenuTrigger } from '@/systems/eru/components/menu';
import { Dialog, DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from '@/systems/eru/components/dialog';
import { AlertDialog, AlertDialogClose, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogPopup, AlertDialogTitle } from '@/systems/eru/components/alert-dialog';
import { Orbiter } from '@/systems/eru/components/orbiter';
import { SealIcon } from '@/systems/eru/components/seal-icon';
import { Shine } from '@/systems/eru/components/shine';
import { Textarea } from '@/systems/eru/components/textarea';
import { Archive, ArrowUp, ArrowUpRight, Check, ChevronRight, EllipsisVertical, MessageCircleQuestionMark, Pencil, Plus, Trash2 } from '@/systems/eru/libraries/icons';
import AppShell, { PageBar } from '../../_components/shell/AppShell';
import { Medallions } from '../../_components/sky/Medallions';
import { SkyData } from '../../_components/sky/Sky';
import type { AstrolabeProps } from '../../_components/sky/astrolabio';
import { TODAY, ago, projectById, type Session, type Task } from '../../_components/data/workspace';
import { liveBodies, projectOfFolder, todaySatellites, weekDots, type FolderChoice, type HomeRow, type ModelProject } from '../../_components/data/inicio';
import styles from './home.module.css';

const UNDO_MS = 8000;
const TODOIST_TODAY = 'https://app.todoist.com/app/today';
const SECTION = 'sm:mt-[22px]';

const PRIORITY_RING = {
  1: 'border-priority-1 text-priority-1 hover:bg-priority-1/10',
  2: 'border-priority-2 text-priority-2 hover:bg-priority-2/10',
  3: 'border-priority-3 text-priority-3 hover:bg-priority-3/10',
  4: 'border-muted-foreground/50 text-muted-foreground hover:bg-muted',
} as const;

const PICKER_TRIGGER =
  'inline-flex h-8 cursor-pointer touch-manipulation items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-foreground transition-[background-color,color,transform] duration-180 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-muted active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 data-popup-open:bg-muted motion-reduce:transition-none motion-reduce:active:scale-100';

export interface TodoistProblem {
  title: string;
  description: string;
  retry: boolean;
}

export const TODOIST_TOKEN_MISSING: TodoistProblem = {
  title: 'O token do Todoist não está configurado.',
  description: 'Defina TODOIST_API_TOKEN no servidor do Hermes e reinicie o dashboard.',
  retry: false,
};

export type TasksState = { kind: 'pronto'; tasks: Task[] } | { kind: 'carregando' } | { kind: 'erro'; problem: TodoistProblem };

export type RecentState = { kind: 'pronto'; sessions: Session[] } | { kind: 'carregando' };

export interface HomeScreenProps {
  inProgress: HomeRow[];
  tasks: TasksState;
  recent: RecentState;
  /** The model projects around the astrolabe, most active first. */
  projects: ModelProject[];
  folders: FolderChoice[];
  /** The folder the field starts in (the recent session's project); null while it loads. */
  folder: string | null;
  /** Sessions of the week drawn as dots on the dial. */
  week: Session[];
  /** Today's schedule runs, the satellites. */
  schedules?: boolean;
}

function greeting(now: Date) {
  const hour = now.getHours();
  if (hour >= 5 && hour < 12) return 'Bom dia';
  return hour >= 12 && hour < 18 ? 'Boa tarde' : 'Boa noite';
}

function useMinute() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

function taskSummary(tasks: Task[]) {
  const overdue = tasks.filter(task => task.overdue).length;
  const today = tasks.length - overdue;
  if (tasks.length === 0) return 'Nada pendente para hoje';
  if (today === 0) return `${overdue} ${overdue === 1 ? 'tarefa atrasada' : 'tarefas atrasadas'}`;
  return [`${today} ${today === 1 ? 'tarefa' : 'tarefas'} para hoje`, overdue > 0 ? `${overdue} ${overdue === 1 ? 'atrasada' : 'atrasadas'}` : null].filter(Boolean).join(' · ');
}

const dueLabel = (task: Task) => (task.overdue ? `Atrasada · ${task.due}` : task.due === 'hoje' ? 'Hoje' : task.due);

function HomeCard({ title, titleId, count, meta, className, children }: { title: string; titleId: string; count?: number; meta?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={titleId} className={cn('flex flex-col gap-1.5', className)}>
      <header className="flex min-h-[22px] items-center gap-3">
        <div className="flex shrink-0 items-baseline gap-1.5 text-[10.5px] leading-none whitespace-nowrap uppercase">
          <h2 id={titleId} className="font-normal tracking-[0.2em] text-muted-foreground">
            {title}
          </h2>
          {count === undefined ? null : <span className="tracking-[0.08em] text-dim tabular-nums">{count}</span>}
        </div>
        <div aria-hidden className="flex min-w-6 flex-1 items-center">
          <span className="h-px flex-1 bg-linear-to-r from-h2 to-h1" />
          <Diamond className="-ml-px border-h3" />
        </div>
        {meta ? <div className="shrink-0 text-xs whitespace-nowrap text-muted-foreground">{meta}</div> : null}
      </header>
      {children}
    </section>
  );
}

function CardState({ children }: { children: ReactNode }) {
  return <div className="py-4 pl-(--axis)">{children}</div>;
}

const IN_ROW = 'transition-opacity duration-150 md:opacity-0 md:group-hover/row:opacity-100 md:group-focus-within/row:opacity-100 md:data-popup-open:opacity-100 motion-reduce:transition-none';

function SessionActions({ session, onRename, onRemove }: { session: Session; onRename: (title: string) => void; onRemove: () => void }) {
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [title, setTitle] = useState(session.title);

  const rename = (event: FormEvent) => {
    event.preventDefault();
    onRename(title.trim() || session.title);
    setRenaming(false);
  };

  return (
    <>
      <Menu>
        <MenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Ações da sessão ${session.title}`} className={cn(IN_ROW, 'text-dim hover:bg-h2 hover:text-ink')} />}>
          <EllipsisVertical />
        </MenuTrigger>
        <MenuPopup align="end">
          <MenuItem
            onClick={() => {
              setTitle(session.title);
              setRenaming(true);
            }}
          >
            <Pencil />
            Renomear
          </MenuItem>
          <MenuItem onClick={onRemove}>
            <Archive />
            Arquivar
          </MenuItem>
          <MenuSeparator />
          <MenuItem variant="destructive" onClick={() => setDeleting(true)}>
            <Trash2 />
            Apagar
          </MenuItem>
        </MenuPopup>
      </Menu>
      <Dialog open={renaming} onOpenChange={setRenaming}>
        <DialogPopup>
          <DialogHeader>
            <DialogTitle>Renomear sessão</DialogTitle>
            <DialogDescription>O novo título também aparece no app desktop.</DialogDescription>
          </DialogHeader>
          <form onSubmit={rename} className="contents">
            <DialogPanel className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor={`titulo-${session.id}`}>Título</Label>
                <Input id={`titulo-${session.id}`} value={title} onChange={event => setTitle(event.target.value)} autoFocus />
              </div>
            </DialogPanel>
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="ghost" />}>Cancelar</DialogClose>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogPopup>
      </Dialog>
      <AlertDialog open={deleting} onOpenChange={setDeleting}>
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar sessão?</AlertDialogTitle>
            <AlertDialogDescription>“{session.title}” será apagada do dashboard, junto com todo o histórico. Isso não pode ser desfeito.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="ghost" />}>Cancelar</AlertDialogClose>
            <Button
              variant="destructive"
              onClick={() => {
                setDeleting(false);
                onRemove();
              }}
            >
              Apagar
            </Button>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </>
  );
}

function SessionRow({ session, state, onRename, onRemove }: { session: Session; state?: HomeRow['state']; onRename: (title: string) => void; onRemove: () => void }) {
  const project = projectById(session.projectId);
  const working = state === 'working';
  return (
    <li aria-label={session.title} data-session-id={session.id} data-working={working ? '' : undefined} className={cn(styles.row, 'group/row')}>
      <Link to="Sessão/Sessão" title={session.title} className={styles.link}>
        <span className={styles.glyph}>
          <SealIcon seal={project?.seal ?? null} working={working} />
        </span>
        <span className={styles.main}>
          <span className={styles.title}>
            {session.title}
            {working ? <span className="sr-only">, em andamento</span> : null}
          </span>
          {state === 'waiting' ? (
            <span className={styles.waiting}>
              <MessageCircleQuestionMark aria-hidden className="size-3.5 shrink-0" />
              <span className="truncate">Esperando sua resposta</span>
            </span>
          ) : working ? (
            <span className={styles.live}>
              <Orbiter className="size-3.5" />
              <Shine text="Respondendo…" />
            </span>
          ) : (
            <span className={styles.prev}>{session.preview}</span>
          )}
        </span>
        <span className={styles.meta}>
          <span className={styles.age}>{working ? 'agora' : ago(session.minutesAgo)}</span>
          {project ? (
            <span className={styles.where}>
              <span className={styles.proj}>{project.label}</span>
            </span>
          ) : null}
        </span>
      </Link>
      <div className={styles.more}>
        <SessionActions session={session} onRename={onRename} onRemove={onRemove} />
      </div>
    </li>
  );
}

interface Glow {
  hotSession: string | null;
  hotProject: string | null;
}

function rowHover(glow: (id: string) => Glow, hover: (glow: Glow) => void) {
  const point = (target: EventTarget | null) => {
    const id = target instanceof Element ? target.closest<HTMLElement>('[data-session-id]')?.dataset.sessionId : undefined;
    hover(id ? glow(id) : { hotSession: null, hotProject: null });
  };
  return {
    onPointerOver: (event: { target: EventTarget | null }) => point(event.target),
    onPointerLeave: () => hover({ hotSession: null, hotProject: null }),
    onFocus: (event: { target: EventTarget | null }) => point(event.target),
    onBlur: (event: FocusEvent<HTMLElement>) => {
      if (!event.currentTarget.contains(event.relatedTarget)) hover({ hotSession: null, hotProject: null });
    },
  };
}

function useSessionEdits() {
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  return {
    apply: (sessions: Session[]) => sessions.filter(session => !removed.has(session.id)).map(session => (titles[session.id] ? { ...session, title: titles[session.id] } : session)),
    rename: (id: string, title: string) => setTitles(current => ({ ...current, [id]: title })),
    remove: (id: string) => setRemoved(current => new Set(current).add(id)),
  };
}

function TaskRow({ task, onComplete }: { task: Task; onComplete: (task: Task) => void }) {
  return (
    <li aria-label={task.title} className="group/task relative flex items-start rounded-lg py-2.5 pr-4 transition-colors hover:bg-muted/40 motion-safe:animate-in motion-safe:fade-in-0 motion-reduce:transition-none">
      <span className="flex w-(--axis) shrink-0 justify-center">
        <button
          type="button"
          aria-label={`Concluir “${task.title}”`}
          title="Concluir"
          onClick={() => onComplete(task)}
          className={cn(
            'relative z-10 mt-0.5 flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-full border-[1.5px] transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none motion-reduce:transition-none',
            PRIORITY_RING[task.priority ?? 4],
          )}
        >
          <Check aria-hidden className="size-3 opacity-0 transition-opacity group-hover/task:opacity-60 hover:opacity-100 motion-reduce:transition-none" strokeWidth={3} />
        </button>
      </span>
      <a
        href={TODOIST_TODAY}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Abrir “${task.title}” no Todoist`}
        title={task.title}
        className="flex min-w-0 flex-1 flex-col gap-0.5 outline-none after:absolute after:inset-0 focus-visible:after:ring-2 focus-visible:after:ring-ring/50 focus-visible:after:ring-inset"
      >
        <span className="truncate text-sm">{task.title}</span>
        <span className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
          <span className={cn('shrink-0', task.overdue && 'font-medium text-destructive')}>{dueLabel(task)}</span>
          {task.project ? (
            <>
              <span aria-hidden>·</span>
              <span className="truncate">{task.project}</span>
            </>
          ) : null}
        </span>
      </a>
      {task.priority ? <span className="sr-only">P{task.priority}</span> : null}
    </li>
  );
}

function NewTask({ onAdd }: { onAdd: (title: string) => void }) {
  const [content, setContent] = useState('');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const text = content.trim();
    if (!text) return;
    onAdd(text);
    setContent('');
  };
  return (
    <form onSubmit={submit} className="flex items-center border-t py-1 pr-2 focus-within:bg-muted/30">
      <span className="flex w-(--axis) shrink-0 justify-center">
        <Plus aria-hidden className="size-4 text-dim" />
      </span>
      <Label htmlFor="nova-tarefa" className="sr-only">
        Nova tarefa para hoje
      </Label>
      <Input
        id="nova-tarefa"
        value={content}
        onChange={event => setContent(event.target.value)}
        placeholder="Nova tarefa para hoje"
        autoComplete="off"
        enterKeyHint="done"
        unstyled
        className="min-w-0 flex-1 text-base sm:text-sm [&_input]:h-11 [&_input]:leading-11"
      />
      {content.trim() ? (
        <Button type="submit" size="sm" variant="ghost" className="shrink-0">
          Adicionar
        </Button>
      ) : null}
    </form>
  );
}

function TaskList({ state, tasks, onComplete, onUndo, completed, onAdd, onRetry }: { state: TasksState; tasks: Task[]; onComplete: (task: Task) => void; onUndo: () => void; completed: Task | null; onAdd: (title: string) => void; onRetry: () => void }) {
  if (state.kind === 'carregando') {
    return (
      <CardState>
        <LoadingState label="Carregando tarefas" lines={3} />
      </CardState>
    );
  }
  if (state.kind === 'erro') {
    return (
      <CardState>
        <ErrorState tone={state.problem.retry ? 'error' : 'warning'} title={state.problem.title} description={state.problem.description} onRetry={state.problem.retry ? onRetry : undefined} />
      </CardState>
    );
  }
  return (
    <>
      {tasks.length === 0 ? (
        <p className="py-4 pl-(--axis) text-sm text-muted-foreground">Nada para hoje nem atrasado. Aproveite.</p>
      ) : (
        <ul aria-label="Tarefas de hoje e atrasadas" className="flex flex-col divide-y">
          {tasks.map(task => (
            <TaskRow key={task.id} task={task} onComplete={onComplete} />
          ))}
        </ul>
      )}
      {completed ? (
        <div
          role="status"
          aria-label="Tarefa concluída"
          className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 py-1.5 pr-2 pl-(--axis) text-sm motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1"
        >
          <span className="min-w-0 truncate">“{completed.title}” concluída.</span>
          <Button variant="outline" size="sm" className="bg-card" onClick={onUndo}>
            Desfazer
          </Button>
        </div>
      ) : null}
      <NewTask onAdd={onAdd} />
    </>
  );
}

function ProjectPicker({ folders, selected, onChoose }: { folders: FolderChoice[]; selected: string | null; onChoose: (path: string) => void }) {
  const chosen = folders.find(option => option.path === selected);
  const title = chosen?.title ?? null;
  const icon = (option: FolderChoice | undefined, size: number) => <SealIcon seal={option?.seal ? option.seal : null} size={size} tone="muted" decorative />;
  return (
    <Menu>
      <MenuTrigger disabled={!selected} aria-label={title ? `Projeto: ${title}` : 'Projeto'} title={selected ?? 'Projeto'} className={cn(PICKER_TRIGGER, 'group max-w-full min-w-0 shrink')}>
        <span className="-ml-0.5 flex shrink-0">{icon(chosen, 16)}</span>
        <span className="truncate">{title ?? '…'}</span>
      </MenuTrigger>
      <MenuPopup side="top" align="start" sideOffset={8} className="w-[min(22rem,calc(100vw-1.5rem))] rounded-xl">
        <MenuGroup>
          <MenuGroupLabel>Projeto</MenuGroupLabel>
          <MenuRadioGroup value={selected} onValueChange={value => onChoose(value as string)}>
            {folders.map(option => (
              <MenuRadioItem key={option.path} value={option.path} label={option.title} closeOnClick className="min-h-11 cursor-pointer rounded-lg md:min-h-0">
                <span className="flex items-center gap-2.5">
                  <span className="flex shrink-0">{icon(option, 18)}</span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm leading-5 font-medium">{option.title}</span>
                    <span className="truncate font-mono text-[11px] leading-4 text-muted-foreground">{option.path}</span>
                  </span>
                </span>
              </MenuRadioItem>
            ))}
          </MenuRadioGroup>
        </MenuGroup>
      </MenuPopup>
    </Menu>
  );
}

function Composer({ picker, onSend }: { picker: ReactNode; onSend: (text: string) => void }) {
  const [text, setText] = useState('');
  const canSend = text.trim().length > 0;
  const send = (event?: FormEvent) => {
    event?.preventDefault();
    if (!canSend) return;
    onSend(text.trim());
    setText('');
  };
  return (
    <form onSubmit={send} className={cn(styles.form, 'group/composer relative isolate')}>
      <div className={cn(styles.field, 'flex flex-col rounded-2xl')}>
        <Textarea
          aria-label="O que o agente deve fazer?"
          value={text}
          onChange={event => setText(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              send();
            }
          }}
          placeholder="O que o agente deve fazer?"
          rows={1}
          unstyled
          className={cn(styles.text, 'min-w-0 [&_textarea]:max-h-60 [&_textarea]:resize-none [&_textarea]:text-base [&_textarea]:leading-relaxed sm:[&_textarea]:text-sm')}
        />
        <div className={cn(styles.bar, 'flex min-w-0 items-center gap-1.5 pt-0.5 pr-2 pb-2')}>
          <div className="flex min-w-0 flex-1 items-center gap-0.5">{picker}</div>
          <button type="submit" aria-label="Enviar" disabled={!canSend} className={cn(styles.send, canSend && styles.ready, 'ml-auto')}>
            <ArrowUp aria-hidden />
          </button>
        </div>
      </div>
    </form>
  );
}

const sessionsSummary = (count: number) => (count > 0 ? `${count} ${count === 1 ? 'sessão trabalhando' : 'sessões trabalhando'}` : null);

export function HomeScreen({ inProgress, tasks: tasksState, recent, projects, folders, folder: initialFolder, week, schedules = true }: HomeScreenProps) {
  const now = useMinute();
  const navigate = useNavigate();
  const edits = useSessionEdits();
  const [folder, setFolder] = useState(initialFolder);
  const [glow, setGlow] = useState<Glow>({ hotSession: null, hotProject: null });
  const [medallionHot, setMedallionHot] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>(tasksState.kind === 'pronto' ? tasksState.tasks : []);
  const [completed, setCompleted] = useState<{ task: Task; index: number } | null>(null);
  const [retries, setRetries] = useState(0);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const complete = (task: Task) => {
    const index = tasks.findIndex(item => item.id === task.id);
    setTasks(current => current.filter(item => item.id !== task.id));
    window.clearTimeout(timer.current);
    setCompleted({ task, index });
    timer.current = window.setTimeout(() => setCompleted(null), UNDO_MS);
  };

  const undo = () => {
    if (!completed) return;
    window.clearTimeout(timer.current);
    setTasks(current => [...current.slice(0, completed.index), completed.task, ...current.slice(completed.index)]);
    setCompleted(null);
  };

  const add = (title: string) => setTasks(current => [...current, { id: `nova-${current.length}-${title}`, title, project: 'Inbox', due: 'hoje' }]);

  const rows = inProgress.filter(row => edits.apply([row.session]).length > 0).map(row => ({ ...row, session: edits.apply([row.session])[0] }));
  const recentSessions = recent.kind === 'pronto' ? edits.apply(recent.sessions) : [];
  const summary = [tasksState.kind === 'pronto' ? taskSummary(tasks) : null, sessionsSummary(rows.length)].filter(Boolean).join(' · ');
  const chosen = projectOfFolder(folder);
  const modelIds = new Set(projects.map(project => project.id));
  const inModel = (id: string | null) => (id && modelIds.has(id) ? id : null);
  const busy = new Set(inProgress.map(row => row.session.id));

  const sky: AstrolabeProps = {
    projects: projects.map(project => ({ id: project.id, seal: project.seal })),
    chosen: inModel(chosen),
    hot: inModel(medallionHot ?? glow.hotProject),
    week: weekDots(now, week).filter(dot => !busy.has(dot.id)),
    bodies: liveBodies(now, inProgress),
    satellites: schedules ? todaySatellites(now) : [],
    hotSession: glow.hotSession,
  };

  const inProgressHover = rowHover(id => ({ hotSession: id, hotProject: null }), setGlow);
  const recentHover = rowHover(id => {
    const project = recentSessions.find(session => session.id === id)?.projectId ?? null;
    return project ? { hotSession: null, hotProject: project } : { hotSession: id, hotProject: null };
  }, setGlow);

  return (
    <SkyData astrolabio={sky}>
      <AppShell
        current="inicio"
        sky="astrolabio"
        bar={<PageBar title="Início" context={TODAY} />}
        layer={
          <Medallions
            projects={projects}
            chosen={inModel(chosen)}
            hot={inModel(medallionHot ?? glow.hotProject)}
            onHot={setMedallionHot}
            onChoose={id => setFolder(projects.find(project => project.id === id)?.path ?? folder)}
          />
        }
      >
        <div className="relative isolate flex-1">
          <div
            data-sky-column="esquerda"
            className="flex w-full flex-col gap-3 px-4 py-6 sm:gap-4 sm:px-6 sm:py-12 md:ml-[clamp(40px,calc(100%_-_1264px),104px)] md:w-[min(600px,calc(100%_-_80px))] md:px-0"
          >
            <header data-sky-greeting="" className="flex flex-col items-start gap-2 sm:mt-3.5 sm:pb-3.5">
              <p className="text-[42px] leading-none font-light tracking-[-0.015em] sm:text-[50px]">{greeting(now)}</p>
              <p className="min-h-5 text-sm text-muted-foreground sm:mt-1.5">{summary}</p>
            </header>
            <div className="relative z-20 flex flex-col gap-2">
              <Composer picker={<ProjectPicker folders={folders} selected={folder} onChoose={setFolder} />} onSend={() => navigate('Sessão/Sessão')} />
            </div>
            {rows.length > 0 ? (
              <HomeCard title="Em andamento" titleId="inicio-em-andamento" count={rows.length} className={SECTION}>
                <ul aria-label="Sessões em andamento" className="flex flex-col divide-y" {...inProgressHover}>
                  {rows.map(({ session, state }) => (
                    <SessionRow key={session.id} session={session} state={state} onRename={title => edits.rename(session.id, title)} onRemove={() => edits.remove(session.id)} />
                  ))}
                </ul>
              </HomeCard>
            ) : null}
            <HomeCard
              title="Tarefas"
              titleId="inicio-tarefas"
              count={tasksState.kind === 'pronto' ? tasks.length : undefined}
              className={SECTION}
              meta={
                <a href={TODOIST_TODAY} target="_blank" rel="noopener noreferrer" aria-label="Abrir o Todoist" className="inline-flex items-center gap-1 hover:text-foreground">
                  <span className="max-sm:hidden">Abrir o</span> Todoist
                  <ArrowUpRight className="size-3.5" aria-hidden />
                </a>
              }
            >
              <TaskList key={retries} state={tasksState} tasks={tasks} onComplete={complete} onUndo={undo} completed={completed?.task ?? null} onAdd={add} onRetry={() => setRetries(count => count + 1)} />
            </HomeCard>
            <HomeCard
              title="Recentes"
              titleId="inicio-recentes"
              className={SECTION}
              meta={
                <Link to="Sessões/Sessões" className="inline-flex items-center gap-0.5 hover:text-foreground">
                  Ver todas
                  <ChevronRight className="size-3.5" aria-hidden />
                </Link>
              }
            >
              {recent.kind === 'carregando' ? (
                <CardState>
                  <LoadingState label="Carregando sessões recentes" lines={3} />
                </CardState>
              ) : recentSessions.length === 0 ? (
                <p className="py-4 pl-(--axis) text-sm text-muted-foreground">Nenhuma outra sessão neste perfil ainda.</p>
              ) : (
                <ul aria-label="Sessões recentes" className="flex flex-col divide-y" {...recentHover}>
                  {recentSessions.map(session => (
                    <SessionRow key={session.id} session={session} onRename={title => edits.rename(session.id, title)} onRemove={() => edits.remove(session.id)} />
                  ))}
                </ul>
              )}
            </HomeCard>
          </div>
        </div>
      </AppShell>
    </SkyData>
  );
}
