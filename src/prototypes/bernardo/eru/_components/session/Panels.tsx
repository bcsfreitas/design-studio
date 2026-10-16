// The four rail panels with sample content, ported from eru features/browser/BrowserPanel.tsx,
// features/terminal/SessionTerminalPanel.tsx, features/rail/FilesPanel.tsx and features/agents (AgentsPanel, SubagentDetail).
import { useState, type ReactNode } from 'react';
import { cn } from '#studio/runtime';
import { Button } from '@/systems/eru/components/button';
import { CodeBlock } from '@/systems/eru/components/code-block';
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from '@/systems/eru/components/collapsible';
import { Markdown } from '@/systems/eru/components/markdown';
import { SealIcon } from '@/systems/eru/components/seal-icon';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  CircleCheck,
  CircleDashed,
  CircleStop,
  CircleX,
  Copy,
  ExternalLink,
  File,
  FileCode,
  FileText,
  Folder,
  FolderGit2,
  FolderTree,
  Globe,
  List,
  Maximize2,
  Power,
  RotateCw,
  Square,
} from '@/systems/eru/libraries/icons';
import { BROWSER_TABS, FILE_TREE, OTHER_RUNNING, SESSION_CWD, SUBAGENTS, TERMINAL_LINES, type FileNode, type Subagent, type TaskState } from '../data/session';
import { projectById } from '../data/workspace';
import { PanelTabContent, PanelTabs, type PanelTab } from './Rail';
import { KIND_ICONS, StatusDot, goalTitle } from './Trail';

const homeRelative = (path: string) => path.replace(/^\/home\/hermes/, '~');

function ToolButton({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick?: () => void; children: ReactNode }) {
  return (
    <Button variant="ghost" size="icon-xs" aria-label={label} title={label} disabled={disabled} onClick={onClick} className="shrink-0 text-muted-foreground">
      {children}
    </Button>
  );
}

/** A page the agent's Chrome shows, drawn in place of the live screenshot: the Design Studio with the Eru prototype. */
function PagePlaceholder({ tab }: { tab: (typeof BROWSER_TABS)[number] }) {
  if (tab.id === 'aba-eru') {
    return (
      <div className="flex size-full bg-[#2b2629] p-2 text-[9px] text-white/70">
        <div className="flex w-8 flex-col items-center gap-2 pt-1">
          {Array.from({ length: 8 }, (_, index) => (
            <span key={index} className="size-3.5 rounded-sm bg-white/10" />
          ))}
        </div>
        <div className="flex flex-1 flex-col rounded-lg border border-white/10 bg-[#3a3337]">
          <div className="flex h-7 items-center gap-2 border-b border-white/10 px-3">
            <span className="size-3 rounded-full border border-white/40" />
            <span>Endless Harness / Instalar design-studio e começar trabalho</span>
          </div>
          <div className="mx-auto flex w-3/5 flex-1 flex-col gap-2 py-4">
            <span className="ml-auto h-6 w-3/5 rounded-md border border-white/20" />
            {Array.from({ length: 6 }, (_, index) => (
              <span key={index} className={cn('h-2 rounded bg-white/15', index % 3 === 2 ? 'w-2/3' : 'w-full')} />
            ))}
            <span className="mt-auto h-10 rounded-lg bg-black/30" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex size-full flex-col bg-[#f7f7f5] text-[10px] text-[#525252]">
      <div className="flex h-8 shrink-0 items-center gap-2 border-b border-[#e5e5e5] bg-white px-3">
        <span className="size-3 rounded-sm bg-[#262626]" />
        <span className="font-medium text-[#262626]">Design Studio</span>
        <span className="text-[#a3a3a3]">/</span>
        <span>Eru</span>
        <span className="ml-auto rounded border border-[#e5e5e5] px-1.5 py-0.5">Compartilhar</span>
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="flex w-36 shrink-0 flex-col gap-1 border-r border-[#e5e5e5] bg-white p-2">
          {['Início', 'Sessão', 'Nova sessão', 'Respondendo', 'Pedindo aprovação', 'Pergunta', 'Projeto', 'Sessões', 'Agendamentos', 'Memória'].map((name, index) => (
            <span key={name} className={cn('truncate rounded px-1.5 py-1', index === 1 ? 'bg-[#f5f5f5] font-medium text-[#171717]' : '')}>
              {name}
            </span>
          ))}
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-center p-4">
          <div className="flex aspect-[16/10] w-full max-w-md overflow-hidden rounded-md border border-[#d4d4d4] bg-[#e8d6c1] shadow-sm">
            <div className="w-6 shrink-0 bg-[#f3e3d0]" />
            <div className="m-1 flex flex-1 flex-col rounded border border-black/10 bg-[#fbf1e4]">
              <div className="h-4 border-b border-black/10" />
              <div className="mx-auto flex w-1/2 flex-1 flex-col justify-end gap-1 pb-2">
                <span className="h-1 rounded bg-black/15" />
                <span className="h-1 w-2/3 rounded bg-black/15" />
                <span className="mt-1 h-4 rounded bg-black/10" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** The agent's Chrome: the tabs in a compact browser row, the address bar and the page. */
export function BrowserPanel() {
  const [tabs, setTabs] = useState(BROWSER_TABS);
  const [active, setActive] = useState(BROWSER_TABS[0].id);
  const [copied, setCopied] = useState(false);
  const current = tabs.find(tab => tab.id === active) ?? tabs[0];

  const panelTabs: PanelTab[] = tabs.map(tab => ({ id: tab.id, label: tab.title, title: `${tab.title}\n${tab.url}`, leading: <Globe aria-hidden className="size-3.5 shrink-0" /> }));

  return (
    <PanelTabs
      label="Abas do navegador"
      variant="browser"
      tabs={panelTabs}
      active={current?.id ?? null}
      onSelect={setActive}
      onClose={id => {
        const rest = tabs.filter(tab => tab.id !== id);
        setTabs(rest);
        if (id === active && rest[0]) setActive(rest[0].id);
      }}
      onAdd={() => {
        const id = `aba-${Date.now()}`;
        setTabs(current => [...current, { id, title: 'Nova aba', url: 'about:blank' }]);
        setActive(id);
      }}
      addLabel="Abrir aba"
    >
      {current ? (
        <PanelTabContent value={current.id}>
          <div className="flex min-h-8 shrink-0 items-center gap-0.5 border-b px-1">
            <ToolButton label="Página anterior">
              <ArrowLeft aria-hidden />
            </ToolButton>
            <ToolButton label="Próxima página" disabled>
              <ArrowRight aria-hidden />
            </ToolButton>
            <ToolButton label="Recarregar">
              <RotateCw aria-hidden />
            </ToolButton>
            <form onSubmit={event => event.preventDefault()} className="mx-1 flex min-w-0 flex-1">
              <input
                key={current.id}
                aria-label="Endereço"
                defaultValue={current.url === 'about:blank' ? '' : current.url}
                spellCheck={false}
                placeholder="Busque ou digite um endereço"
                onFocus={event => event.currentTarget.select()}
                className="h-6 w-full min-w-0 rounded-md bg-muted/60 px-2 text-xs text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-info/60"
              />
            </form>
            <ToolButton
              label={copied ? 'Endereço copiado' : 'Copiar endereço'}
              onClick={() => {
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
            </ToolButton>
            <ToolButton label="Abrir em outra janela">
              <ExternalLink aria-hidden />
            </ToolButton>
          </div>
          <div data-pagina-ao-vivo="" className="relative min-h-0 flex-1 overflow-hidden bg-white select-none">
            {current.url === 'about:blank' ? null : <PagePlaceholder tab={current} />}
          </div>
        </PanelTabContent>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-10 text-center">
          <Globe aria-hidden className="size-6 text-muted-foreground" />
          <p className="text-sm font-medium text-pretty">O navegador não tem nenhuma aba aberta</p>
        </div>
      )}
    </PanelTabs>
  );
}

const TONES = { prompt: 'text-[#8ae234] font-bold', path: 'text-[#729fcf] font-bold', ok: 'text-[#8ae234]', dim: 'text-[#a8a8a8]', warn: 'text-[#fce94f]' } as const;

/** The session's shells, in tabs: the folder with the actions, and the terminal (a styled pre in place of xterm). */
export function TerminalPanel() {
  const [shells, setShells] = useState([{ id: 't1', label: 'endless-harness' }]);
  const [active, setActive] = useState('t1');
  const [confirming, setConfirming] = useState(false);
  const [ended, setEnded] = useState<string[]>([]);
  const current = shells.find(shell => shell.id === active) ?? shells[0];
  const open = current && !ended.includes(current.id);

  return (
    <PanelTabs
      label="Shells da sessão"
      tabs={shells.map(shell => ({ id: shell.id, label: shell.label, leading: <span aria-hidden className={cn('size-1.5 shrink-0 rounded-full', ended.includes(shell.id) ? 'bg-muted-foreground' : 'bg-success')} /> }))}
      active={current?.id ?? null}
      onSelect={setActive}
      onClose={id => {
        const rest = shells.filter(shell => shell.id !== id);
        setShells(rest);
        if (rest[0]) setActive(rest[0].id);
      }}
      onAdd={() => {
        const id = `t${Date.now()}`;
        setShells(current => [...current, { id, label: 'endless-harness' }]);
        setActive(id);
      }}
      addLabel="Abrir outro shell"
    >
      {current ? (
        <PanelTabContent value={current.id} className="gap-1.5 p-1.5">
          <div className="flex min-h-8 shrink-0 items-center gap-1 pl-2">
            <FolderGit2 aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground" title={SESSION_CWD}>
              {homeRelative(SESSION_CWD)}
            </span>
            {confirming ? (
              <div role="group" aria-label="Encerrar o shell" className="flex shrink-0 items-center gap-1">
                <span className="px-1 text-xs">Encerrar o shell?</span>
                <Button
                  variant="destructive"
                  size="xs"
                  autoFocus
                  onClick={() => {
                    setEnded(current => [...current, active]);
                    setConfirming(false);
                  }}
                >
                  Encerrar
                </Button>
                <Button variant="ghost" size="xs" onClick={() => setConfirming(false)}>
                  Cancelar
                </Button>
              </div>
            ) : (
              <>
                <Button variant="ghost" size="icon-sm" aria-label="Abrir na área Terminal" title="Abrir na área Terminal">
                  <Maximize2 aria-hidden />
                </Button>
                {open ? (
                  <Button variant="ghost" size="icon-sm" aria-label="Encerrar o shell" title="Encerrar o shell" onClick={() => setConfirming(true)}>
                    <Power aria-hidden />
                  </Button>
                ) : null}
              </>
            )}
          </div>
          {open ? null : (
            <div role="status" className="flex shrink-0 items-center gap-2 rounded-md border border-warning/32 bg-warning/8 px-2 py-1.5 text-xs text-warning-foreground">
              <p className="min-w-0 flex-1 text-pretty">O shell foi encerrado.</p>
              <Button variant="outline" size="xs" onClick={() => setEnded(current => current.filter(id => id !== active))}>
                Abrir outro
              </Button>
            </div>
          )}
          <pre aria-label="Terminal" className="min-h-0 flex-1 overflow-auto rounded-lg bg-[#121212] p-1 font-mono text-[13px] leading-[1.25] whitespace-pre-wrap text-[#e5e5e5]">
            {TERMINAL_LINES.map((line, index) => (
              <div key={index}>
                {line.map((part, partIndex) => (
                  <span key={partIndex} className={part.tone ? TONES[part.tone] : undefined}>
                    {part.text}
                  </span>
                ))}
                {index === TERMINAL_LINES.length - 1 && open ? <span aria-hidden className="inline-block h-[1.1em] w-[0.6em] translate-y-[2px] bg-[#e5e5e5]" /> : null}
                {line.length === 1 && !line[0].text ? '\u00a0' : null}
              </div>
            ))}
          </pre>
        </PanelTabContent>
      ) : null}
    </PanelTabs>
  );
}

const CODE_FILE = /\.(tsx?|jsx?|json|css|ya?ml|toml)$/i;

function EntryIcon({ entry }: { entry: FileNode }) {
  const className = 'size-4 shrink-0 text-muted-foreground';
  if (entry.children) return <Folder className={cn(className, 'fill-current/15')} aria-hidden />;
  if (CODE_FILE.test(entry.name)) return <FileCode className={className} aria-hidden />;
  if (/\.(md|txt|log)$/i.test(entry.name)) return <FileText className={className} aria-hidden />;
  return <File className={className} aria-hidden />;
}

const ROW = 'flex min-h-8 w-full cursor-pointer items-center gap-2 rounded-md pr-2 text-left text-sm hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none';
const indent = (depth: number) => ({ paddingLeft: `${0.5 + depth * 0.875}rem` });

function FileTree({ entries, depth, current, onOpen }: { entries: FileNode[]; depth: number; current: string | null; onOpen: (entry: FileNode) => void }) {
  if (entries.length === 0) {
    return (
      <p className="py-1.5 pr-2 text-xs text-muted-foreground" style={indent(depth)}>
        Pasta vazia.
      </p>
    );
  }

  return (
    <ul className="flex flex-col">
      {entries.map(entry => (
        <li key={entry.path}>
          {entry.children ? (
            <Collapsible defaultOpen={current?.startsWith(`${entry.path}/`)}>
              <CollapsibleTrigger className={`group/pasta ${ROW}`} style={indent(depth)}>
                <ChevronRight aria-hidden className="size-3.5 shrink-0 text-muted-foreground transition-transform duration-200 group-data-panel-open/pasta:rotate-90 motion-reduce:transition-none" />
                <EntryIcon entry={entry} />
                <span className="min-w-0 flex-1 truncate">{entry.name}</span>
              </CollapsibleTrigger>
              <CollapsiblePanel className="motion-reduce:transition-none">
                <FileTree entries={entry.children} depth={depth + 1} current={current} onOpen={onOpen} />
              </CollapsiblePanel>
            </Collapsible>
          ) : (
            <button type="button" aria-current={current === entry.path ? 'true' : undefined} onClick={() => onOpen(entry)} className={cn(ROW, current === entry.path && 'bg-muted font-medium')} style={indent(depth)}>
              <span aria-hidden className="size-3.5 shrink-0" />
              <EntryIcon entry={entry} />
              <span className="min-w-0 flex-1 truncate">{entry.name}</span>
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

function findNode(entries: FileNode[], path: string): FileNode | null {
  for (const entry of entries) {
    if (entry.path === path) return entry;
    const found = entry.children ? findNode(entry.children, path) : null;
    if (found) return found;
  }
  return null;
}

const TREE = 'pastas';

export interface OpenFiles {
  files: string[];
  active: string | null;
}

/** The folder tree of the session's folder as a fixed first tab; each file opened in it becomes a tab with its preview. */
export function FilesPanel({ open, onChange }: { open: OpenFiles; onChange: (next: OpenFiles) => void }) {
  const files = open.files.map(path => findNode(FILE_TREE, path) ?? { name: path.split('/').at(-1)!, path, content: '' });
  const openFile = (entry: FileNode) => onChange({ files: open.files.includes(entry.path) ? open.files : [...open.files, entry.path], active: entry.path });

  const tabs: PanelTab[] = [
    { id: TREE, label: 'Pastas', title: 'Pastas e arquivos do projeto', fixed: true, leading: <FolderTree aria-hidden className="size-3.5 shrink-0" /> },
    ...files.map(file => ({ id: file.path, label: file.name, title: homeRelative(file.path), leading: <EntryIcon entry={file} /> })),
  ];

  return (
    <PanelTabs
      label="Arquivos abertos"
      tabs={tabs}
      active={open.active ?? TREE}
      onSelect={id => onChange({ ...open, active: id === TREE ? null : id })}
      onClose={id => {
        const index = open.files.indexOf(id);
        const rest = open.files.filter(path => path !== id);
        onChange({ files: rest, active: open.active === id ? (rest[index] ?? rest[index - 1] ?? null) : open.active });
      }}
    >
      <PanelTabContent value={TREE} className="overflow-y-auto">
        <div className="flex flex-col gap-1.5 p-1.5">
          <p className="flex min-h-8 items-center gap-2 px-2 text-xs text-muted-foreground" title={SESSION_CWD}>
            <FolderGit2 aria-hidden className="size-3.5 shrink-0" />
            <span className="min-w-0 truncate font-mono">{homeRelative(SESSION_CWD)}</span>
          </p>
          <div className="flex flex-col gap-1">
            <FileTree entries={FILE_TREE} depth={0} current={open.active} onOpen={openFile} />
            <div role="separator" className="mx-2 my-1 border-t" />
            <span className="flex min-h-8 cursor-pointer items-center gap-2 rounded-md px-2 text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground">
              <ExternalLink aria-hidden className="size-3.5" />
              Abrir em Arquivos
            </span>
          </div>
        </div>
      </PanelTabContent>
      {files.map(file => (
        <PanelTabContent key={file.path} value={file.path}>
          <div className="flex min-h-9 shrink-0 items-center gap-1 border-b py-0.5 pr-1 pl-3">
            <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground" title={file.path}>
              {homeRelative(file.path)}
            </span>
            <Button variant="ghost" size="icon-sm" aria-label="Abrir em Arquivos" title="Abrir em Arquivos">
              <ExternalLink aria-hidden />
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {file.content ? (
              file.language === 'markdown' ? (
                <Markdown className="text-sm">{file.content}</Markdown>
              ) : (
                <CodeBlock code={file.content} language={file.language} className="p-3 text-xs" />
              )
            ) : (
              <p className="text-sm text-muted-foreground">Este arquivo não tem pré-visualização.</p>
            )}
          </div>
        </PanelTabContent>
      ))}
    </PanelTabs>
  );
}

function StatusIcon({ status, className }: { status: TaskState; className?: string }) {
  switch (status) {
    case 'running':
      return <span aria-hidden className={cn('m-0.5 size-3 shrink-0 rounded-full border-[1.5px] border-border border-t-foreground motion-safe:animate-spin', className)} />;
    case 'completed':
      return <CircleCheck aria-hidden className={cn('size-4 shrink-0 text-success-foreground', className)} />;
    case 'failed':
      return <CircleX aria-hidden className={cn('size-4 shrink-0 text-destructive-foreground', className)} />;
    case 'interrupted':
      return <CircleStop aria-hidden className={cn('size-4 shrink-0 text-warning-foreground', className)} />;
    default:
      return <CircleDashed aria-hidden className={cn('size-4 shrink-0 text-muted-foreground', className)} />;
  }
}

const ITEM = 'flex min-h-8 w-full min-w-0 cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none';

const STATUS_NAMES: Record<TaskState, string> = { running: 'Rodando', completed: 'Terminou', failed: 'Falhou', interrupted: 'Interrompido', ended: 'Encerrado' };

function Heading({ children }: { children: string }) {
  return <h3 className="px-2 pt-1 pb-0.5 text-xs font-medium text-muted-foreground">{children}</h3>;
}

function SubagentDetail({ subagent, onInterrupt }: { subagent: Subagent; onInterrupt: () => void }) {
  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-2">
        <h2 className="font-heading text-base font-semibold break-words">{subagent.goal}</h2>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm">
          <StatusIcon status={subagent.status} />
          <span>{subagent.line}</span>
          {subagent.status === 'running' ? (
            <span className="ml-auto flex flex-wrap items-center gap-2">
              <Button variant="outline" size="xs" onClick={onInterrupt}>
                <Square aria-hidden className="size-2.5 fill-current" />
                Interromper
              </Button>
            </span>
          ) : null}
        </div>
      </header>
      <section className="flex flex-col gap-1.5">
        <h3 className="text-xs font-medium text-muted-foreground">O que fez</h3>
        <ol aria-label="O que o subagente fez" className="relative ml-1.25 flex flex-col gap-0.5 py-1 pl-4 before:absolute before:inset-y-0 before:left-0.75 before:w-px before:bg-border">
          {subagent.steps.map(step => {
            const Icon = step.icon === 'reasoning' || step.icon === 'approved' || step.icon === 'denied' ? KIND_ICONS.other : KIND_ICONS[step.icon];
            return (
              <li key={step.key} className="flex min-h-7 min-w-0 items-center gap-2 rounded-md px-1.5 py-0.5 text-xs">
                <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                <span className="min-w-0 truncate text-foreground/85">{step.label}</span>
              </li>
            );
          })}
        </ol>
      </section>
      {subagent.summary ? (
        <section className="flex flex-col gap-1.5">
          <h3 className="text-xs font-medium text-muted-foreground">Resultado</h3>
          <Markdown variant="compact" className="text-sm">
            {subagent.summary}
          </Markdown>
        </section>
      ) : null}
      <Collapsible className="flex flex-col">
        <CollapsibleTrigger className="group/detalhes -mx-1.5 flex w-fit cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none">
          Detalhes técnicos
          <ChevronRight aria-hidden className="size-3.5 transition-transform group-data-panel-open/detalhes:rotate-90 motion-reduce:transition-none" />
        </CollapsibleTrigger>
        <CollapsiblePanel>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 pt-2 text-xs">
            <dt className="text-muted-foreground">Modelo</dt>
            <dd className="min-w-0 font-mono break-words">{subagent.model}</dd>
            <dt className="text-muted-foreground">Identificador</dt>
            <dd className="min-w-0 font-mono break-words">{subagent.id}</dd>
            <dt className="text-muted-foreground">Ferramentas usadas</dt>
            <dd className="min-w-0 break-words">{subagent.tools}</dd>
          </dl>
        </CollapsiblePanel>
      </Collapsible>
    </div>
  );
}

const LIST = 'lista';

/**
 * The Agentes panel: the first, fixed tab lists this session's subagents, live, and the other sessions of the profile that are
 * running; each subagent opened in it becomes a tab with its detail and the state dot.
 */
export function AgentsPanel({ subagents = SUBAGENTS }: { subagents?: Subagent[] }) {
  const [rows, setRows] = useState(subagents);
  const [open, setOpen] = useState<string[]>([]);
  const [active, setActive] = useState<string | null>(null);

  const openOne = (id: string) => {
    setOpen(current => (current.includes(id) ? current : [...current, id]));
    setActive(id);
  };

  const interrupt = (id: string) => setRows(current => current.map(row => (row.id === id ? { ...row, status: 'interrupted', line: 'Interrompido depois de 12 min' } : row)));

  const tabs: PanelTab[] = [
    { id: LIST, label: 'Lista', title: 'Subagentes desta sessão e outras sessões rodando', fixed: true, leading: <List aria-hidden className="size-3.5 shrink-0" /> },
    ...open.flatMap(id => {
      const row = rows.find(item => item.id === id);
      return row ? [{ id, label: goalTitle(row.goal), title: `${row.goal} · ${STATUS_NAMES[row.status]}`, leading: <StatusDot status={row.status} /> }] : [];
    }),
  ];

  return (
    <PanelTabs
      label="Subagentes abertos"
      tabs={tabs}
      active={active ?? LIST}
      onSelect={id => setActive(id === LIST ? null : id)}
      onClose={id => {
        const rest = open.filter(item => item !== id);
        setOpen(rest);
        if (active === id) setActive(rest.at(-1) ?? null);
      }}
    >
      <PanelTabContent value={LIST} className="overflow-y-auto">
        <div className="flex flex-col gap-3 p-1.5 pb-3">
          <section className="flex flex-col">
            <Heading>Subagentes desta sessão</Heading>
            {rows.length === 0 ? (
              <p className="px-2 py-1 text-xs text-muted-foreground">Nenhum subagente nesta sessão.</p>
            ) : (
              <ul aria-label="Subagentes desta sessão" className="flex flex-col gap-0.5">
                {rows.map(subagent => (
                  <li key={subagent.id} className={cn('flex flex-wrap items-start gap-0.5', subagent.depth && 'ml-4')}>
                    <button type="button" aria-current={active === subagent.id ? 'true' : undefined} onClick={() => openOne(subagent.id)} className={cn(ITEM, 'flex-1', active === subagent.id && 'bg-muted')}>
                      <StatusIcon status={subagent.status} className="mt-px" />
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className={cn('truncate text-foreground', active === subagent.id ? 'font-semibold' : 'font-medium')}>{goalTitle(subagent.goal)}</span>
                        <span className="text-muted-foreground">{subagent.line}</span>
                        {subagent.detail ? <span className="line-clamp-2 break-words text-muted-foreground">{subagent.detail}</span> : null}
                      </span>
                    </button>
                    {subagent.status === 'running' ? (
                      <Button variant="ghost" size="icon-sm" aria-label={`Interromper ${goalTitle(subagent.goal)}`} title="Interromper" onClick={() => interrupt(subagent.id)} className="mt-0.5 shrink-0 rounded-full text-muted-foreground hover:text-foreground">
                        <Square aria-hidden className="size-2.5 fill-current" />
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="flex flex-col">
            <Heading>Outras sessões rodando</Heading>
            <ul aria-label="Outras sessões rodando" className="flex flex-col gap-0.5">
              {OTHER_RUNNING.map(session => {
                const project = projectById(session.projectId);
                return (
                  <li key={session.id}>
                    <span className={ITEM}>
                      <span className="flex size-4 shrink-0 items-center justify-center">
                        <SealIcon seal={project?.seal ?? null} size={16} working decorative />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="truncate font-medium text-foreground">{session.title}</span>
                        <span className="truncate text-muted-foreground">
                          {project?.label} · {session.state}
                        </span>
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </PanelTabContent>
      {open.map(id => {
        const row = rows.find(item => item.id === id);
        return row ? (
          <PanelTabContent key={id} value={id} className="overflow-y-auto p-4">
            <SubagentDetail subagent={row} onInterrupt={() => interrupt(id)} />
          </PanelTabContent>
        ) : null;
      })}
    </PanelTabs>
  );
}
