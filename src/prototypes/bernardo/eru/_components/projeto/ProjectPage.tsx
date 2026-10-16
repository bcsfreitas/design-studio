// The project page, ported from eru features/project-page/ProjectPage: the page bar with the seal, the name and the
// folder, the tab row (sticky, under the bar) and the tab's content in the 720 px column (the board takes the whole
// card), with the drawer of an open card or file over it and the project's seal in the sky.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '#studio/runtime';
import { SealIcon } from '@/systems/eru/components/seal-icon';
import { PROJECT_TABS, type CaixaItem, type CardAcao, type EstadoHermes, type Nota, type ProjectData, type ProjectTabId, type QuadroCard } from '../data/projeto';
import AppShell, { PAGE_COLUMN, PageBar } from '../shell/AppShell';
import { CaixaTab, FileDrawer, SendFileAction } from './CaixaTab';
import { leafOf, ProjectPageContext, type DrawerItem, type LoadState, type ProjectPageValue } from './context';
import { NewNoteAction, NotasTab } from './NotasTab';
import { takeHandedNote, TabLink } from './nav';
import { Overview } from './Overview';
import { CardDrawer, NewCardAction, QuadroBoard } from './QuadroBoard';
import { RascunhosTab } from './RascunhosTab';

const NEXT_STATE: Partial<Record<CardAcao, EstadoHermes>> = {
  pronto: 'ready',
  mandar: 'running',
  responder: 'running',
  aprovar: 'done',
  'pedir-mudancas': 'running',
};

/** The tab row right below the page bar: one link per tab. It sticks to the top of the card when the page scrolls. */
function TabRow() {
  return (
    <nav aria-label="Abas do projeto" className="sticky top-0 z-30 flex shrink-0 gap-1 overflow-x-auto overscroll-x-contain border-b border-h1 bg-background/80 px-4 backdrop-blur-sm [scrollbar-width:none]">
      {PROJECT_TABS.map(tab => (
        <CurrentTabLink key={tab.id} tab={tab.id}>
          {tab.label}
        </CurrentTabLink>
      ))}
    </nav>
  );
}

function CurrentTabLink({ tab, children }: { tab: ProjectTabId; children: ReactNode }) {
  return (
    <ProjectPageContext.Consumer>
      {page => (
        <TabLink
          tab={tab}
          aria-current={page?.tab === tab ? 'page' : undefined}
          className="relative flex h-11 shrink-0 cursor-pointer items-center px-2.5 text-[13px] whitespace-nowrap text-muted-foreground after:absolute after:inset-x-2.5 after:bottom-0 after:h-px hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset aria-[current=page]:text-foreground aria-[current=page]:after:bg-foreground md:h-10"
        >
          {children}
        </TabLink>
      )}
    </ProjectPageContext.Consumer>
  );
}

const CONTENT: Record<ProjectTabId, () => ReactNode> = {
  'visao-geral': Overview,
  rascunhos: RascunhosTab,
  quadro: QuadroBoard,
  notas: NotasTab,
  caixa: CaixaTab,
};

const ACTION: Partial<Record<ProjectTabId, () => ReactNode>> = {
  quadro: NewCardAction,
  notas: NewNoteAction,
  caixa: SendFileAction,
};

export interface ProjectPageProps {
  data: ProjectData;
  tab: ProjectTabId;
  /** The state of the page's data: ready, the project list and the folder's routes still loading, or the plugin failing. */
  status?: LoadState;
  /** Switch tabs inside the view (for the states) instead of going to each tab's view. */
  local?: boolean;
}

export function ProjectPage({ data, tab: initialTab, status: initialStatus = 'pronto', local = false }: ProjectPageProps) {
  const [tab, setTab] = useState(initialTab);
  const [status, setStatus] = useState(initialStatus);
  const [cards, setCards] = useState<QuadroCard[]>(data.quadro.cards);
  const [notas, setNotasState] = useState<Nota[]>(data.notas);
  const [caixa, setCaixaState] = useState<CaixaItem[]>(data.caixa);
  const [drawer, setDrawer] = useState<DrawerItem>(null);
  const [note, setNote] = useState<string | null>(() => (initialTab === 'notas' && !local ? takeHandedNote() : null));
  const [dentro, setDentro] = useState('');
  const retrying = useRef<number | null>(null);

  useEffect(() => () => window.clearTimeout(retrying.current ?? undefined), []);

  const known = status !== 'carregando';
  const project = data.project;

  const value: ProjectPageValue = {
    data,
    cards,
    notas,
    caixa,
    status,
    known,
    tab,
    local,
    goTab: next => {
      setTab(next);
      setDrawer(null);
      if (next !== 'notas') setNote(null);
    },
    retry: () => {
      setStatus('carregando');
      retrying.current = window.setTimeout(() => setStatus('pronto'), 900);
    },
    drawer,
    setDrawer,
    act: (id, acao, change) =>
      setCards(current =>
        acao === 'arquivar'
          ? current.filter(card => card.id !== id)
          : current.map(card => {
              if (card.id !== id) return card;
              if (acao === 'editar') return { ...card, ...change };
              const estado = NEXT_STATE[acao];
              return estado ? { ...card, estado, pergunta: undefined } : card;
            }),
      ),
    addCard: card => setCards(current => [...current, card]),
    note,
    setNote: nome => {
      setNote(nome);
      if (nome && tab !== 'notas') setTab('notas');
    },
    setNotas: update => setNotasState(update),
    setCaixa: update => setCaixaState(update),
    dentro,
    setDentro: caminho => {
      setDentro(caminho);
      setDrawer(null);
    },
  };

  const Content = CONTENT[tab];
  const Action = ACTION[tab];
  const wide = tab === 'quadro';
  const open = drawer?.kind === 'card' ? (cards.some(card => card.id === drawer.id) ? drawer : null) : drawer;

  return (
    <ProjectPageContext value={value}>
      <AppShell
        sky={known ? { seal: project.seal } : 'calmo'}
        bar={
          <PageBar
            lead={known ? <SealIcon seal={project.seal} size={24} tone="muted" decorative /> : null}
            title={known ? project.label : leafOf(data.folder)}
            context={<span title={data.folder}>{project.path}</span>}
            action={Action ? <Action /> : undefined}
          />
        }
        layer={open?.kind === 'card' ? <CardDrawer key={open.id} id={open.id} /> : open?.kind === 'arquivo' ? <FileDrawer key={open.caminho} caminho={open.caminho} /> : null}
      >
        <div className="project-page relative isolate flex min-w-0 flex-1 flex-col">
          <TabRow />
          <div className={wide ? 'flex w-full min-w-0 flex-1 flex-col p-4 sm:p-6' : cn(PAGE_COLUMN, 'session-column')}>
            <Content />
          </div>
          {wide ? <span hidden className="session-column" /> : null}
        </div>
      </AppShell>
    </ProjectPageContext>
  );
}

