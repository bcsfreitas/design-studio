// The side menu as eru draws it on a wide screen: the icon column and, when open, the recent sessions panel beside it.
// The boards lay several of them side by side, each in a frame with the edge of the main card, so every interaction can
// be compared at once.
import type { ReactNode } from 'react';
import { IconColumn, type IconColumnProps } from './IconColumn';
import { ProjectsPanel, type ProjectsPanelProps } from './ProjectsPanel';

export interface SideMenuProps extends IconColumnProps {
  /** The panel's starting state, when it is open. */
  panel?: ProjectsPanelProps;
}

export function SideMenu({ panel, ...column }: SideMenuProps) {
  return (
    <>
      <IconColumn {...column} />
      {column.projectsOpen ? (
        <aside aria-label="Projetos" className="flex h-full w-72 shrink-0 flex-col pt-2.5 pr-2 pb-2 text-sidebar-foreground">
          <ProjectsPanel {...panel} />
        </aside>
      ) : null}
    </>
  );
}

/** A still board: a title, what it shows, and the cases in a row. */
export function Board({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background p-12 text-foreground">
      <header className="flex max-w-180 flex-col gap-1.5">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </header>
      <div className="mt-10 flex flex-wrap items-start gap-x-10 gap-y-12">{children}</div>
    </div>
  );
}

/**
 * One case of a board: its name and note above the menu, drawn at `zoom` so the small column reads on a canvas.
 * `reserve` keeps room on the right for a tooltip that comes out of the frame.
 */
export function Case({ label, note, zoom = 1, height = 620, reserve = 0, children }: { label: string; note?: string; zoom?: number; height?: number; reserve?: number; children: ReactNode }) {
  return (
    <figure className="flex flex-col gap-3" style={{ paddingRight: reserve }}>
      <figcaption className="flex min-h-12 max-w-60 flex-col gap-0.5">
        <span className="text-sm font-medium">{label}</span>
        {note ? <span className="text-xs leading-4 text-muted-foreground">{note}</span> : null}
      </figcaption>
      <div style={{ zoom }} className="self-start">
        <div style={{ height }} className="flex rounded-xl border border-h1 bg-sidebar text-foreground">
          {children}
          <div aria-hidden className="my-2 w-6 shrink-0 rounded-l-2xl border border-r-0 border-h2 bg-background" />
        </div>
      </div>
    </figure>
  );
}
