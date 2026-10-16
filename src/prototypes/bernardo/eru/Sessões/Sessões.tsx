/** @studio-id bk6qc9ss4qfqn20h */
// Sessões, from eru features/sessions/SessionsPage: the bar with how many sessions and projects the profile has, the
// search as the main field, the project filter in chips with the archived ones at the end, and the sessions in plates by
// day. Search, filter, archived view and the row menu work locally.
import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { cn } from '#studio/runtime';
import { AlertDialog, AlertDialogClose, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogPopup, AlertDialogTitle } from '@/systems/eru/components/alert-dialog';
import { Button } from '@/systems/eru/components/button';
import { Dialog, DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from '@/systems/eru/components/dialog';
import { ErrorState } from '@/systems/eru/components/error-state';
import { Input } from '@/systems/eru/components/input';
import { Label } from '@/systems/eru/components/label';
import { Menu, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from '@/systems/eru/components/menu';
import { SealIcon } from '@/systems/eru/components/seal-icon';
import { Skeleton } from '@/systems/eru/components/skeleton';
import { Archive, ArchiveRestore, EllipsisVertical, Pencil, Search, Trash2 } from '@/systems/eru/libraries/icons';
import AppShell, { PAGE_COLUMN, PageBar } from '../_components/shell/AppShell';
import { ALL_SESSIONS, ARCHIVED_SESSIONS, byDay, chipProjects, plural, searchSessions, sessionLabel, sessionsSummary, type ListedSession, type ProjectNode } from '../_components/data/sessions';
import { SessionRow } from '../_components/sessions/SessionRow';
import styles from '../_components/sessions/session-list.module.css';

export type SessionsState = 'ready' | 'loading' | 'error' | 'empty';

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-2 pt-8" aria-hidden>
      {[0, 1, 2].map(index => (
        <Skeleton key={index} className="h-14 w-full rounded-lg" />
      ))}
    </div>
  );
}

function Plate({ label, count, children }: { label: string; count: number; children: ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id}>
      <header className={styles.plate}>
        <h2 id={id} className={styles.plateLabel}>
          {label}
        </h2>
        <span className={styles.count}>{count}</span>
      </header>
      <ul aria-labelledby={id} className="flex flex-col">
        {children}
      </ul>
    </section>
  );
}

const IN_ROW = 'transition-opacity duration-150 md:opacity-0 md:group-hover/row:opacity-100 md:group-focus-within/row:opacity-100 md:data-popup-open:opacity-100 motion-reduce:transition-none text-dim hover:bg-h2 hover:text-ink';

function SessionActions({ session, onRename, onArchive, onDelete }: { session: ListedSession; onRename: (title: string) => void; onArchive: () => void; onDelete: () => void }) {
  const label = sessionLabel(session);
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [title, setTitle] = useState(label);

  const rename = (event: FormEvent) => {
    event.preventDefault();
    onRename(title.trim());
    setRenaming(false);
  };

  return (
    <>
      <Menu>
        <MenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Ações da sessão ${label}`} className={IN_ROW} />}>
          <EllipsisVertical />
        </MenuTrigger>
        <MenuPopup align="end">
          <MenuItem onClick={() => setRenaming(true)}>
            <Pencil />
            Renomear
          </MenuItem>
          <MenuItem onClick={onArchive}>
            {session.archived ? <ArchiveRestore /> : <Archive />}
            {session.archived ? 'Desarquivar' : 'Arquivar'}
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
            <AlertDialogDescription>“{label}” será apagada do dashboard, junto com todo o histórico. Isso não pode ser desfeito.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="ghost" />}>Cancelar</AlertDialogClose>
            <Button
              variant="destructive"
              onClick={() => {
                setDeleting(false);
                onDelete();
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

function ProjectChips({ projects, chosen, onChoose }: { projects: ProjectNode[]; chosen: string | null; onChoose: (id: string | null) => void }) {
  return (
    <div role="group" aria-label="Filtrar por projeto" className="contents">
      <button type="button" className={styles.chip} aria-pressed={chosen === null} onClick={() => onChoose(null)}>
        Todos
      </button>
      {projects.map(project => (
        <button key={project.id} type="button" className={styles.chip} aria-pressed={chosen === project.id} onClick={() => onChoose(project.id)}>
          <SealIcon seal={project.project?.seal ?? null} size={15} decorative className={styles.chipSeal} />
          {project.label}
          <span aria-hidden className={styles.chipCount}>
            {project.sessionCount}
          </span>
          <span className="sr-only">, {plural(project.sessionCount, 'sessão', 'sessões')}</span>
        </button>
      ))}
    </div>
  );
}

export interface SessionsScreenProps {
  state?: SessionsState;
  /** The text already in the search field. */
  initialSearch?: string;
  projectsOpen?: boolean;
}

export function SessionsScreen({ state = 'ready', initialSearch = '', projectsOpen = false }: SessionsScreenProps) {
  const [search, setSearch] = useState(initialSearch);
  const [archivedView, setArchivedView] = useState(false);
  const [chosenId, setChosenId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ListedSession[]>(state === 'empty' ? [] : [...ALL_SESSIONS, ...ARCHIVED_SESSIONS]);
  const [olderShown, setOlderShown] = useState(false);
  const text = search.trim();
  const searching = text.length > 0;
  const chips = state === 'ready' || state === 'error' ? chipProjects() : [];
  const chosen = chips.find(project => project.id === chosenId) ?? null;
  const inChosen = (session: ListedSession) => !chosen || (session.projectId ?? 'none') === chosen.id;

  const update = (id: string, change: (session: ListedSession) => ListedSession | null) =>
    setSessions(current => current.flatMap(session => (session.id === id ? [change(session)].filter((next): next is ListedSession => next !== null) : [session])));

  const actionsOf = (session: ListedSession) => (
    <SessionActions
      session={session}
      onRename={title => update(session.id, current => ({ ...current, title }))}
      onArchive={() => update(session.id, current => ({ ...current, archived: !current.archived }))}
      onDelete={() => update(session.id, () => null)}
    />
  );

  let list: ReactNode;

  if (state === 'loading') {
    list = <ListSkeleton />;
  } else if (state === 'error') {
    list = <ErrorState title="Não foi possível carregar as sessões." onRetry={() => undefined} />;
  } else if (searching) {
    const results = searchSessions(text, sessions.filter(session => !session.archived)).filter(result => inChosen(result.session));
    list =
      results.length === 0 ? (
        <div className={styles.list}>
          <p className={styles.empty}>
            Nenhuma sessão com “{text}”{chosen ? ` em ${chosen.label}` : ''}.
          </p>
        </div>
      ) : (
        <div className={styles.list}>
          <Plate label="Resultados da busca" count={results.length}>
            {results.map(result => (
              <SessionRow key={result.session.id} session={result.session} snippet={result.snippet} />
            ))}
          </Plate>
        </div>
      );
  } else {
    const shown = sessions.filter(session => Boolean(session.archived) === archivedView && inChosen(session));
    const visible = archivedView || olderShown || chosen ? shown : shown.filter(session => session.minutesAgo < 60 * 24 * 7);
    list = (
      <div className={styles.list}>
        {visible.length === 0 ? (
          <p className={styles.empty}>{archivedView ? `Nenhuma sessão arquivada ${chosen ? `em ${chosen.label}` : 'neste perfil'}.` : chosen ? `Nenhuma sessão em ${chosen.label}.` : 'Nenhuma sessão neste perfil ainda.'}</p>
        ) : (
          <section aria-label={archivedView ? 'Sessões arquivadas' : 'Sessões do perfil'} className="flex flex-col">
            {byDay(visible).map(([day, group]) => (
              <Plate key={day} label={day} count={group.length}>
                {group.map(session => (
                  <SessionRow key={session.id} session={session} actions={actionsOf(session)} />
                ))}
              </Plate>
            ))}
          </section>
        )}
        {visible.length < shown.length ? (
          <button type="button" className={styles.older} onClick={() => setOlderShown(true)}>
            Mostrar as sessões mais antigas
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <AppShell current="sessoes" projectsOpen={projectsOpen} bar={<PageBar area="sessoes" context={state === 'loading' ? null : sessionsSummary(chips)} />}>
      <section data-sky-column className={cn(PAGE_COLUMN, 'max-w-192')}>
        <div className={styles.top}>
          <label className={styles.search}>
            <Search aria-hidden />
            <input type="search" aria-label="Buscar sessões" placeholder="Buscar por título ou resposta" value={search} onChange={event => setSearch(event.target.value)} />
          </label>
          {chips.length > 0 || !searching ? (
            <div className={styles.chips}>
              {chips.length > 0 ? <ProjectChips projects={chips} chosen={chosen?.id ?? null} onChoose={setChosenId} /> : null}
              {searching ? null : (
                <>
                  {chips.length > 0 ? <span aria-hidden className={styles.chipGap} /> : null}
                  <button type="button" className={styles.chip} aria-pressed={archivedView} onClick={() => setArchivedView(view => !view)}>
                    <Archive aria-hidden />
                    Arquivadas
                  </button>
                </>
              )}
            </div>
          ) : null}
        </div>
        {list}
      </section>
    </AppShell>
  );
}

export default function Sessoes() {
  return <SessionsScreen />;
}
