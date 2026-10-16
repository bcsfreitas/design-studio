// The recent sessions by project, beside the icon column, from eru features/sessions/SidebarSessions (the desktop panel):
// the search on top with the new project button, each project with its seal and branch once, a compact row per session,
// "Mais N" per project and "Ver todas as sessões" at the foot.
import { useState } from 'react';
import { Link } from '@module/prototypes';
import { cn } from '#studio/runtime';
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from '@/systems/eru/components/collapsible';
import { SealIcon } from '@/systems/eru/components/seal-icon';
import { SidebarMenu, SidebarMenuAction, SidebarMenuItem, SidebarMenuSkeleton } from '@/systems/eru/components/sidebar';
import { ChevronRight, FolderPlus, GitBranch, Pencil, Plus, Search } from '@/systems/eru/libraries/icons';
import { ALL_SESSIONS, panelProjects, searchSessions, sessionsOfNode, type ListedSession, type ProjectNode } from '../data/sessions';
import { CompactRow } from './SessionRow';
import styles from './session-list.module.css';

const PANEL_PREVIEW = 4;
const MORE_STEP = 10;

const MENU_BUTTON =
  'peer/menu-button flex w-full items-center overflow-hidden text-left outline-hidden ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground [&>svg]:shrink-0';

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

function ProjectItem({ node, open, onOpenChange, found }: { node: ProjectNode; open: boolean; onOpenChange: (open: boolean) => void; found?: ListedSession[] }) {
  const [limit, setLimit] = useState(PANEL_PREVIEW);
  const all = sessionsOfNode(node);
  const sessions = found ?? all.slice(0, limit);
  const remaining = found ? 0 : node.sessionCount - sessions.length;
  const branch = node.project?.branch;
  const label = node.label;

  return (
    <SidebarMenuItem>
      <Collapsible open={open} onOpenChange={onOpenChange}>
        {node.project ? (
          <div className={cn(styles.spHead, 'relative flex items-center rounded-md md:group-hover/menu-item:pe-14 md:group-focus-within/menu-item:pe-14')}>
            <Link to="Projeto/Visão geral" className={cn(MENU_BUTTON, 'h-8 min-w-0 flex-1 gap-[7px] rounded-md px-2 text-[12.5px]')}>
              <SealIcon seal={node.project.seal} size={16} decorative />
              <span className={styles.spName}>{label}</span>
              {branch ? <GitMeta branch={branch} /> : null}
            </Link>
            <CollapsibleTrigger
              title={open ? `Recolher ${label}` : `Mostrar as sessões de ${label}`}
              className="group/projeto relative flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-dim hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none"
            >
              <ChevronRight
                aria-hidden
                className="size-3.5 transition-transform group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 group-data-panel-open/projeto:rotate-90 md:opacity-0 motion-reduce:transition-none"
              />
              <span className="sr-only">
                {label}, {node.sessionCount} {node.sessionCount === 1 ? 'sessão' : 'sessões'}
              </span>
            </CollapsibleTrigger>
          </div>
        ) : (
          <CollapsibleTrigger className={cn(MENU_BUTTON, styles.spHead, 'group/projeto h-8 cursor-pointer gap-[7px] rounded-md px-2 text-[12.5px]')}>
            <SealIcon seal={null} size={16} decorative />
            <span className={styles.spName}>{label}</span>
            <ChevronRight
              aria-hidden
              className="ml-auto size-3.5 shrink-0 text-dim transition-transform group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 group-data-panel-open/projeto:rotate-90 md:opacity-0 motion-reduce:transition-none"
            />
            <span className="sr-only">
              , {node.sessionCount} {node.sessionCount === 1 ? 'sessão' : 'sessões'}
            </span>
          </CollapsibleTrigger>
        )}
        {node.project ? (
          <SidebarMenuAction showOnHover aria-label={`Nova sessão em ${label}`} title={`Nova sessão em ${label}`} render={<Link to="Sessão/Nova sessão" />}>
            <Plus />
          </SidebarMenuAction>
        ) : null}
        {node.project ? (
          <SidebarMenuAction showOnHover aria-label={`Editar ${label}`} title={`Editar ${label}`} className="right-7">
            <Pencil />
          </SidebarMenuAction>
        ) : null}
        <CollapsiblePanel>
          <ul aria-label={`Sessões de ${label}`} className="flex flex-col">
            {sessions.map(session => (
              <CompactRow key={session.id} session={session} meta={session.branch ? <GitMeta branch={session.branch} /> : null} />
            ))}
            {remaining > 0 || (!found && limit > PANEL_PREVIEW) ? (
              <li className="flex">
                {remaining > 0 ? (
                  <button type="button" className={styles.spMore} onClick={() => setLimit(current => current + MORE_STEP)}>
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

export type ProjectsPanelState = 'ready' | 'loading' | 'error' | 'empty';

function ProjectList({ text, state }: { text: string; state: ProjectsPanelState }) {
  const [closed, setClosed] = useState<Record<string, boolean>>({});
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
          onOpenChange={open => (found ? undefined : setClosed(current => ({ ...current, [node.id]: !open })))}
          found={found ? sessionsOfNode(node, found) : undefined}
        />
      ))}
    </SidebarMenu>
  );
}

export function ProjectsPanel({ state = 'ready' }: { state?: ProjectsPanelState }) {
  const [search, setSearch] = useState('');

  return (
    <nav aria-label="Sessões por projeto" className="flex min-h-0 flex-1 flex-col text-muted-foreground">
      <div className="flex shrink-0 flex-col gap-2 px-1 pb-2">
        <div className="flex items-center gap-1">
          <label className={styles.spSearch}>
            <Search aria-hidden />
            <input type="search" aria-label="Buscar sessões" placeholder="Buscar sessões" value={search} onChange={event => setSearch(event.target.value)} />
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
        <ProjectList text={search.trim()} state={state} />
      </div>
      <div className="mt-1.5 shrink-0 border-t border-h1 px-1 pt-2">
        <Link to="Sessões/Sessões" className={styles.spAll}>
          Ver todas as sessões
          <ChevronRight aria-hidden />
        </Link>
      </div>
    </nav>
  );
}
