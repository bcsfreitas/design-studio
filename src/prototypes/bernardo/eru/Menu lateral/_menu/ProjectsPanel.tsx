// The recent sessions panel, copied from _components/sessions/ProjectsPanel so it can change here first. It opens
// beside the icon column: the search with the new project button, each project with its seal and branch once, a compact
// row per session, "Mais N" per project and "Ver todas as sessões" at the foot. A board can start it in any state and
// hold a hover still.
import { useState } from 'react';
import { Link } from '@module/prototypes';
import { cn } from '#studio/runtime';
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from '@/systems/eru/components/collapsible';
import { SealIcon } from '@/systems/eru/components/seal-icon';
import { SidebarMenu, SidebarMenuAction, SidebarMenuItem, SidebarMenuSkeleton } from '@/systems/eru/components/sidebar';
import { ChevronRight, FolderPlus, GitBranch, Pencil, Plus, Search } from '@/systems/eru/libraries/icons';
import { ALL_SESSIONS, panelProjects, searchSessions, sessionLabel, sessionsOfNode, shortAge, type ListedSession, type ProjectNode } from '../../_components/data/sessions';
import styles from './panel.module.css';

const PANEL_PREVIEW = 4;
const MORE_STEP = 10;

const MENU_BUTTON =
  'peer/menu-button flex w-full items-center overflow-hidden text-left outline-hidden ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-hover:bg-sidebar-accent data-hover:text-sidebar-accent-foreground [&>svg]:shrink-0';

export type ProjectsPanelState = 'ready' | 'loading' | 'error' | 'empty';

export interface PanelPreview {
  /** The project whose row is under the pointer: its actions and chevron show. */
  project?: string;
  /** The session whose row is under the pointer. */
  session?: string;
  /** The foot link under the pointer. */
  all?: boolean;
  /** The search field focused. */
  search?: boolean;
}

export interface ProjectsPanelProps {
  state?: ProjectsPanelState;
  search?: string;
  /** Projects that start collapsed. */
  closed?: string[];
  /** Projects that start with "Mais N" pressed once. */
  expanded?: string[];
  /** The session marked as open. */
  current?: string;
  preview?: PanelPreview;
}

function GitMeta({ branch }: { branch: string }) {
  return (
    <span aria-hidden title={branch} className={styles.spGit}>
      <span className={styles.spBranch}>
        <GitBranch />
        <span>{branch}</span>
      </span>
    </span>
  );
}

function CompactRow({ session, current, hover }: { session: ListedSession; current: boolean; hover: boolean }) {
  const label = sessionLabel(session);
  return (
    <li>
      <Link to="Sessão/Sessão" title={label} aria-current={current ? 'page' : undefined} data-hover={hover ? '' : undefined} className={styles.spRow}>
        <span className={styles.spLine}>
          <span className={styles.spTitle}>{label}</span>
          <span aria-hidden className={styles.spAge}>
            {session.working ? 'agora' : shortAge(session.minutesAgo)}
          </span>
        </span>
        {session.branch ? (
          <span>
            <GitMeta branch={session.branch} />
          </span>
        ) : null}
      </Link>
    </li>
  );
}

interface ProjectItemProps {
  node: ProjectNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  found?: ListedSession[];
  startExpanded: boolean;
  current?: string;
  preview?: PanelPreview;
}

function ProjectItem({ node, open, onOpenChange, found, startExpanded, current, preview }: ProjectItemProps) {
  const [limit, setLimit] = useState(startExpanded ? PANEL_PREVIEW + MORE_STEP : PANEL_PREVIEW);
  const all = sessionsOfNode(node);
  const sessions = found ?? all.slice(0, limit);
  const remaining = found ? 0 : node.sessionCount - sessions.length;
  const branch = node.project?.branch;
  const label = node.label;
  const hovered = preview?.project === node.id;
  const chevron = cn('size-3.5 transition-transform group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 group-data-panel-open/projeto:rotate-90 motion-reduce:transition-none', !hovered && 'md:opacity-0');

  return (
    <SidebarMenuItem>
      <Collapsible open={open} onOpenChange={onOpenChange}>
        {node.project ? (
          <div className={cn(styles.spHead, 'relative flex items-center rounded-md md:group-hover/menu-item:pe-14 md:group-focus-within/menu-item:pe-14', hovered && 'pe-14')}>
            <Link to="Projeto/Visão geral" data-hover={hovered ? '' : undefined} className={cn(MENU_BUTTON, 'h-8 min-w-0 flex-1 gap-[7px] rounded-md px-2 text-[12.5px]')}>
              <SealIcon seal={node.project.seal} size={16} decorative />
              <span className={styles.spName}>{label}</span>
              {branch ? <GitMeta branch={branch} /> : null}
            </Link>
            <CollapsibleTrigger
              title={open ? `Recolher ${label}` : `Mostrar as sessões de ${label}`}
              className="group/projeto relative flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-dim hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none"
            >
              <ChevronRight aria-hidden className={chevron} />
              <span className="sr-only">
                {label}, {node.sessionCount} {node.sessionCount === 1 ? 'sessão' : 'sessões'}
              </span>
            </CollapsibleTrigger>
          </div>
        ) : (
          <CollapsibleTrigger data-hover={hovered ? '' : undefined} className={cn(MENU_BUTTON, styles.spHead, 'group/projeto h-8 cursor-pointer gap-[7px] rounded-md px-2 text-[12.5px]')}>
            <SealIcon seal={null} size={16} decorative />
            <span className={styles.spName}>{label}</span>
            <ChevronRight aria-hidden className={cn(chevron, 'ml-auto shrink-0 text-dim')} />
            <span className="sr-only">
              , {node.sessionCount} {node.sessionCount === 1 ? 'sessão' : 'sessões'}
            </span>
          </CollapsibleTrigger>
        )}
        {node.project ? (
          <SidebarMenuAction showOnHover={!hovered} aria-label={`Nova sessão em ${label}`} title={`Nova sessão em ${label}`} render={<Link to="Sessão/Nova sessão" />}>
            <Plus />
          </SidebarMenuAction>
        ) : null}
        {node.project ? (
          <SidebarMenuAction showOnHover={!hovered} aria-label={`Editar ${label}`} title={`Editar ${label}`} className="right-7">
            <Pencil />
          </SidebarMenuAction>
        ) : null}
        <CollapsiblePanel>
          <ul aria-label={`Sessões de ${label}`} className="flex flex-col">
            {sessions.map(session => (
              <CompactRow key={session.id} session={session} current={current === session.id} hover={preview?.session === session.id} />
            ))}
            {remaining > 0 || (!found && limit > PANEL_PREVIEW) ? (
              <li className="flex">
                {remaining > 0 ? (
                  <button type="button" className={styles.spMore} onClick={() => setLimit(value => value + MORE_STEP)}>
                    Mais {remaining}
                  </button>
                ) : null}
                {limit > PANEL_PREVIEW ? (
                  <button type="button" className={cn(styles.spMore, remaining > 0 && 'pl-2')} onClick={() => setLimit(PANEL_PREVIEW)}>
                    Mostrar menos
                  </button>
                ) : null}
              </li>
            ) : null}
          </ul>
        </CollapsiblePanel>
      </Collapsible>
    </SidebarMenuItem>
  );
}

function PanelSkeleton() {
  return (
    <div aria-hidden>
      {[0, 1, 2].map(index => (
        <SidebarMenuSkeleton key={index} />
      ))}
    </div>
  );
}

function ProjectList({ text, state, closed: initialClosed, expanded, current, preview }: { text: string } & Omit<ProjectsPanelProps, 'search'>) {
  const [closed, setClosed] = useState<Record<string, boolean>>(() => Object.fromEntries((initialClosed ?? []).map(id => [id, true])));
  const projects = panelProjects();

  if (state === 'error') {
    return (
      <div role="alert" className="flex flex-col items-start gap-1 px-2 text-xs text-muted-foreground">
        Não foi possível carregar as sessões.
        <button type="button" className="cursor-pointer text-foreground underline-offset-2 hover:underline">
          Tentar de novo
        </button>
      </div>
    );
  }

  if (state === 'loading') {
    return <PanelSkeleton />;
  }

  if (state === 'empty' || projects.length === 0) {
    return <p className="px-2 text-xs text-muted-foreground">Nenhuma sessão ainda.</p>;
  }

  const found = text ? searchSessions(text, ALL_SESSIONS).map(result => result.session) : null;

  if (found && found.length === 0) {
    return <p className="px-2 py-1 text-xs text-muted-foreground">Nenhuma sessão encontrada.</p>;
  }

  const shown = found ? projects.filter(node => sessionsOfNode(node, found).length > 0) : projects;

  return (
    <SidebarMenu className="gap-3.5">
      {shown.map(node => (
        <ProjectItem
          key={node.id}
          node={node}
          open={found ? true : !closed[node.id]}
          onOpenChange={open => (found ? undefined : setClosed(value => ({ ...value, [node.id]: !open })))}
          found={found ? sessionsOfNode(node, found) : undefined}
          startExpanded={expanded?.includes(node.id) ?? false}
          current={current}
          preview={preview}
        />
      ))}
    </SidebarMenu>
  );
}

export function ProjectsPanel({ state = 'ready', search: initialSearch = '', closed, expanded, current, preview }: ProjectsPanelProps) {
  const [search, setSearch] = useState(initialSearch);

  return (
    <nav aria-label="Sessões por projeto" className="flex min-h-0 flex-1 flex-col text-muted-foreground">
      <div className="flex shrink-0 flex-col gap-2 px-1 pb-2">
        <div className="flex items-center gap-1">
          <label className={cn(styles.spSearch, preview?.search && 'text-foreground')}>
            <Search aria-hidden />
            <input type="search" aria-label="Buscar sessões" placeholder="Buscar sessões" value={search} onChange={event => setSearch(event.target.value)} />
            {preview?.search ? <span aria-hidden className="-ml-2 h-4 w-px animate-pulse bg-foreground" /> : null}
          </label>
          <button
            type="button"
            aria-label="Novo projeto"
            title="Novo projeto"
            className="flex size-[34px] shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none motion-reduce:transition-none [&_svg]:size-4"
          >
            <FolderPlus aria-hidden />
          </button>
        </div>
      </div>
      <div className="quiet-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-1">
        <ProjectList text={search.trim()} state={state} closed={closed} expanded={expanded} current={current} preview={preview} />
      </div>
      <div className="mt-1.5 shrink-0 border-t border-h1 px-1 pt-2">
        <Link to="Sessões/Sessões" data-hover={preview?.all ? '' : undefined} className={styles.spAll}>
          Ver todas as sessões
          <ChevronRight aria-hidden />
        </Link>
      </div>
    </nav>
  );
}
