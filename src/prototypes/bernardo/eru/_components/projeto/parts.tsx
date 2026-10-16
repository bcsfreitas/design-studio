// Small pieces the project page shares with Início and the sessions list, ported from eru features/home/HomeCard,
// features/sessions/SessionRow and SessionActions, and features/project-page/EmptyTab.
import type { ReactNode } from 'react';
import { Link } from '@module/prototypes';
import { cn } from '#studio/runtime';
import { Button } from '@/systems/eru/components/button';
import { Diamond } from '@/systems/eru/components/diamond';
import { Menu, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from '@/systems/eru/components/menu';
import { Orbiter } from '@/systems/eru/components/orbiter';
import { SealIcon } from '@/systems/eru/components/seal-icon';
import { Shine } from '@/systems/eru/components/shine';
import { Archive, EllipsisVertical, MessageCircleQuestionMark, Pencil, Trash2 } from '@/systems/eru/libraries/icons';
import { ago, type Session } from '../data/workspace';

/**
 * A section of Início and of the project's overview, without a card: the small uppercase title, a 1 px rule fading into a
 * hollow diamond and, on the right, a link or a summary. The rows below are separated by rules.
 */
export function HomeCard({ title, titleId, count, meta, className, children }: { title: string; titleId: string; count?: number; meta?: ReactNode; className?: string; children: ReactNode }) {
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

/** The content of a tab that shows nothing yet: one sentence about what it will have. */
export function EmptyTab({ children }: { children: string }) {
  return <p className="rounded-lg border border-dashed border-h2 px-4 py-10 text-center text-sm text-muted-foreground">{children}</p>;
}

const IN_ROW =
  'transition-opacity duration-150 max-md:size-11 md:opacity-0 md:group-hover/row:opacity-100 md:group-focus-within/row:opacity-100 md:data-popup-open:opacity-100 motion-reduce:transition-none';

/** The "⋮" of a session row: on a computer it shows on hover or focus of the row. */
export function SessionActions({ label }: { label: string }) {
  return (
    <Menu>
      <MenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Ações da sessão ${label}`} className={cn(IN_ROW, 'text-dim hover:bg-h2 hover:text-ink')} />}>
        <EllipsisVertical />
      </MenuTrigger>
      <MenuPopup align="end">
        <MenuItem>
          <Pencil />
          Renomear
        </MenuItem>
        <MenuItem>
          <Archive />
          Arquivar
        </MenuItem>
        <MenuSeparator />
        <MenuItem variant="destructive">
          <Trash2 />
          Apagar
        </MenuItem>
      </MenuPopup>
    </Menu>
  );
}

/** The live state in place of the preview: "Respondendo…" with the orbiting body, or the agent's question waiting. */
function StateLine({ waiting }: { waiting: boolean }) {
  return waiting ? (
    <span className="flex min-w-0 items-center gap-1.5 text-[13px] leading-[1.4] text-warning-foreground">
      <MessageCircleQuestionMark aria-hidden className="size-3.5 shrink-0" />
      <span className="truncate">Esperando sua resposta</span>
    </span>
  ) : (
    <span className="flex min-w-0 items-center gap-1.5 text-[13px] leading-[1.4] [&_.shine-base]:text-gold-text [&_.shine-base]:opacity-75 [&_.shine-copy]:text-gold-text">
      <Orbiter className="size-3.5" />
      <Shine text="Respondendo…" />
    </span>
  );
}

/**
 * The full session row of every list: the project's seal in the axis gutter, the title and, below, the last reply or the
 * live state; on the right the age. On the project's page the project's name is left out (only the seal).
 */
export function SessionRow({ session, seal, live = false }: { session: Session; seal: string | null; live?: boolean }) {
  const working = live && Boolean(session.working);
  const waiting = live && Boolean(session.waiting) && !working;
  const label = session.title;

  return (
    <li aria-label={label} data-working={working ? '' : undefined} className="group/row relative list-none rounded-lg transition-colors duration-150 hover:bg-h1 focus-within:bg-h1 motion-reduce:transition-none">
      <Link to="Sessão/Sessão" title={label} className="flex min-h-14 items-center gap-3 rounded-lg py-2 pr-10 text-inherit no-underline outline-0 focus-visible:shadow-[inset_0_0_0_1px_var(--h3)]">
        <span className="-mr-3 grid w-(--axis) shrink-0 place-items-center">
          <SealIcon seal={seal} working={working} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-sm leading-[1.4] font-medium text-ink">
            {label}
            {working ? <span className="sr-only">, em andamento</span> : null}
          </span>
          {working || waiting ? <StateLine waiting={waiting} /> : <span className="truncate text-[13px] leading-[1.4] text-muted-foreground">{session.preview}</span>}
        </span>
        <span className="flex max-w-[40%] shrink-0 flex-col items-end gap-0.5 text-xs text-muted-foreground">
          <span className={cn('tabular-nums', working && 'text-gold-text')}>{working ? 'agora' : ago(session.minutesAgo)}</span>
        </span>
      </Link>
      <div className="absolute top-1/2 right-1.5 -translate-y-1/2">
        <SessionActions label={label} />
      </div>
    </li>
  );
}
