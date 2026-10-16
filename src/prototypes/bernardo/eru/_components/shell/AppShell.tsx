// The eru frame every screen shares, as on a wide screen: the icon column on the left, the projects panel beside it when
// open, and the main card with the sky behind the page bar and the content. Ported from eru features/shell (AppShell,
// IconNav, PageBar, PageTrail) with navigation through the prototype and the data fixed.
import { useState, type ReactNode } from 'react';
import { Link } from '@module/prototypes';
import { cn } from '#studio/runtime';
import { Diamond } from '@/systems/eru/components/diamond';
import { Tooltip, TooltipPopup, TooltipTrigger } from '@/systems/eru/components/tooltip';
import { ArrowLeft, Plus, Settings } from '@/systems/eru/libraries/icons';
import { Button } from '@/systems/eru/components/button';
import { AREAS, NEW_SESSION_TO, areaById, type AreaId } from './areas';
import { ProviderIcon } from './ProviderIcon';
import { ProjectsPanel } from '../sessions/ProjectsPanel';
import { Sky, type SkyScene } from '../sky/Sky';

const ITEM =
  'group/item relative flex size-10 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none aria-[current=page]:text-foreground aria-expanded:bg-sidebar-accent aria-expanded:text-gold-text motion-reduce:transition-none [&_svg]:size-[1.125rem]';

const NEW_SESSION =
  'group/item relative flex size-10 cursor-pointer items-center justify-center rounded-full text-gold-text transition-colors duration-150 hover:bg-tint/12 focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none motion-reduce:transition-none [&_svg.lucide]:size-[1.125rem]';

export function Hint({ label, children }: { label: string; children: React.ReactElement }) {
  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipPopup side="right" sideOffset={10}>
        {label}
      </TooltipPopup>
    </Tooltip>
  );
}

function CurrentMark() {
  return (
    <span aria-hidden className="pointer-events-none absolute inset-y-0 -left-2 hidden w-4 items-center group-aria-[current=page]/item:flex">
      <Diamond className="border-foreground" />
      <span className="ml-[3px] h-px w-[7px] bg-h3" />
    </span>
  );
}

function NewSessionRings() {
  return (
    <svg aria-hidden viewBox="0 0 40 40" className="pointer-events-none absolute inset-0 size-10 fill-none stroke-current">
      <circle cx="20" cy="20" r="17" strokeOpacity={0.8} strokeWidth={1} />
      <circle cx="20" cy="20" r="13.5" strokeOpacity={0.25} strokeWidth={0.8} />
      <path d="M20 0v2.5M20 37.5V40M0 20h2.5M37.5 20H40" strokeOpacity={0.7} strokeWidth={1} />
    </svg>
  );
}

function NavSeparator() {
  return (
    <div role="separator" aria-orientation="horizontal" className="my-2 flex h-[9px] w-[18px] items-center">
      <span className="h-px flex-1 bg-h2" />
      <span className="mx-px size-1 shrink-0 rotate-45 border border-h3" />
      <span className="h-px flex-1 bg-h2" />
    </div>
  );
}

const USAGE = [
  { provider: 'anthropic', name: 'Anthropic', remaining: 92 },
  { provider: 'openai', name: 'OpenAI', remaining: 100 },
];

const FILL = { folga: 'bg-success', apertado: 'bg-warning', critico: 'bg-destructive' } as const;
const band = (remaining: number) => (remaining < 20 ? 'critico' : remaining < 50 ? 'apertado' : 'folga');

function UsageRail() {
  return (
    <div role="group" aria-label="Uso dos modelos" className="flex flex-col items-center gap-1">
      {USAGE.map(card => {
        const filled = Math.min(5, Math.max(1, Math.round(card.remaining / 20)));
        return (
          <button
            key={card.provider}
            type="button"
            title={`${card.name}: ${card.remaining}% restante`}
            className="flex w-10 cursor-pointer flex-col items-center gap-1.5 rounded-lg pt-2 pb-1.5 transition-colors duration-150 hover:bg-sidebar-accent"
          >
            <ProviderIcon provider={card.provider} name={card.name} className="size-[1.125rem]" />
            <span aria-hidden className="flex items-end gap-[2px]">
              {Array.from({ length: 5 }, (_, index) => (
                <span key={index} className={cn('h-2.5 w-[3px] rounded-full', index < filled ? FILL[band(card.remaining)] : 'bg-foreground/15')} />
              ))}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function IconNav({ current, projectsOpen, onToggleProjects }: { current?: AreaId | 'nova-sessao'; projectsOpen: boolean; onToggleProjects: () => void }) {
  return (
    <div className="flex h-full w-16 shrink-0 flex-col items-center gap-3 py-3 text-sidebar-foreground">
      <button
        type="button"
        aria-label="Perfil ativo"
        title="Perfil: default"
        className="flex size-9 cursor-pointer items-center justify-center rounded-full border border-h3 font-display text-[17px] font-medium text-ink uppercase transition-opacity duration-150 hover:opacity-85"
      >
        <span aria-hidden>D</span>
      </button>
      <nav aria-label="Navegação" className="flex flex-col items-center gap-1">
        <Hint label="Nova sessão">
          <Link to={NEW_SESSION_TO} aria-label="Nova sessão" aria-current={current === 'nova-sessao' ? 'page' : undefined} className={NEW_SESSION}>
            <NewSessionRings />
            <Plus aria-hidden strokeWidth={1.5} />
            <CurrentMark />
          </Link>
        </Hint>
        {(['principal', 'mais'] as const).map(group => (
          <div key={group} className="contents">
            <NavSeparator />
            <div role="group" aria-label={group === 'principal' ? 'Principal' : 'Mais'} className="flex flex-col items-center gap-1">
              {AREAS.filter(area => area.group === group).map(area =>
                area.id === 'sessoes' ? (
                  <Hint key={area.id} label="Sessões recentes">
                    <button
                      type="button"
                      aria-label="Sessões recentes"
                      aria-expanded={projectsOpen}
                      aria-current={current === 'sessoes' ? 'page' : undefined}
                      onClick={onToggleProjects}
                      className={ITEM}
                    >
                      <area.icon aria-hidden />
                      <CurrentMark />
                    </button>
                  </Hint>
                ) : (
                  <Hint key={area.id} label={area.title}>
                    {area.to ? (
                      <Link to={area.to} aria-label={area.title} aria-current={current === area.id ? 'page' : undefined} className={ITEM}>
                        <area.icon aria-hidden />
                        <CurrentMark />
                      </Link>
                    ) : (
                      <span role="link" aria-disabled aria-label={area.title} className={cn(ITEM, 'cursor-default opacity-60')}>
                        <area.icon aria-hidden />
                      </span>
                    )}
                  </Hint>
                ),
              )}
            </div>
          </div>
        ))}
      </nav>
      <div className="mt-auto flex flex-col items-center gap-2">
        <UsageRail />
        <Hint label="Ajustes e conta">
          <button
            type="button"
            aria-label="Ajustes e conta"
            className="flex size-10 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <Settings aria-hidden className="size-[1.125rem]" />
          </button>
        </Hint>
      </div>
    </div>
  );
}

export interface PageBarProps {
  /** The area whose title and description fill the bar unless the page gives others. */
  area?: AreaId;
  title?: ReactNode;
  titleClassName?: string;
  marks?: ReactNode;
  /** The context on the right of the bar: the area's description or, in a detail, where it comes from. */
  context?: ReactNode;
  contextClassName?: string;
  back?: { label: string; to: string };
  lead?: ReactNode;
  action?: ReactNode;
}

/** The page bar, on one line: the title on the left, the context on the right and the main action at the end. */
export function PageBar({ area, title, titleClassName, marks, context, contextClassName, back, lead, action }: PageBarProps) {
  const info = area ? areaById(area) : undefined;
  const line = context === undefined ? info?.description : context;
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      {back ? (
        <Button variant="ghost" size="icon" aria-label={back.label} className="-ml-2 size-8 shrink-0" render={<Link to={back.to} />}>
          <ArrowLeft aria-hidden />
        </Button>
      ) : null}
      {lead ? <div className="flex shrink-0 items-center">{lead}</div> : null}
      <div className="flex min-w-0 shrink items-center gap-2">
        <h1 className={cn('min-w-0 font-heading text-[15px] leading-5 font-semibold tracking-tight', titleClassName ?? 'truncate')}>{title ?? info?.title}</h1>
        {marks}
      </div>
      <div className="min-w-4 flex-1" />
      {line ? <div className={contextClassName ?? 'min-w-0 truncate text-xs leading-4 text-muted-foreground'}>{line}</div> : null}
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  );
}

/** The trail at the top of pages without their own bar (Início and a new session): the area, or the project. */
export function PageTrail({ steps }: { steps: { label: string; glyph?: ReactNode }[] }) {
  return (
    <nav aria-label="Onde você está" className="min-w-0">
      <ol className="flex min-w-0 flex-nowrap items-center gap-2 text-sm">
        {steps.map((step, index) => (
          <li key={step.label} className={cn('flex items-center gap-2', index === steps.length - 1 ? 'min-w-0' : 'shrink-0')}>
            {index > 0 ? <span aria-hidden className="text-muted-foreground/60">/</span> : null}
            <span className={cn('flex min-w-0 items-center gap-2', index === steps.length - 1 ? 'font-medium text-foreground' : 'text-muted-foreground')}>
              {step.glyph}
              <span className="truncate">{step.label}</span>
            </span>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** The width of the content column in every area: 720 px, centred. */
export const PAGE_COLUMN = 'mx-auto flex w-full max-w-180 min-w-0 flex-col p-6';

export interface AppShellProps {
  /** The area marked in the icon column; none on pages outside the areas (a project's page). */
  current?: AreaId | 'nova-sessao';
  /** What goes in the bar at the top of the card: a PageBar or a PageTrail. Defaults to the area's trail. */
  bar?: ReactNode;
  /** The sky behind the card, as eru draws it for the page. */
  sky?: SkyScene;
  /** Opens with the recent sessions panel beside the icon column. */
  projectsOpen?: boolean;
  /** The side rail of a session, on the card's right edge, outside the scrolling page. */
  rail?: ReactNode;
  /** A layer fixed to the card, in front of the content and outside the scroll. */
  layer?: ReactNode;
  /** A card beside the main card, on the right edge of the screen: the open panel of a session's rail. */
  side?: ReactNode;
  /** Replaces the scrolling page, for screens that manage their own scroll (a session with its composer). */
  fill?: boolean;
  children: ReactNode;
}

export default function AppShell({ current, bar, sky = 'calmo', projectsOpen: initialProjects = false, rail, layer, side, fill = false, children }: AppShellProps) {
  const [projectsOpen, setProjectsOpen] = useState(initialProjects);
  const area = current === undefined || current === 'nova-sessao' ? undefined : areaById(current);
  return (
    <div className="flex h-screen min-h-0 w-full overflow-hidden bg-sidebar text-foreground">
      <IconNav current={current} projectsOpen={projectsOpen} onToggleProjects={() => setProjectsOpen(open => !open)} />
      {projectsOpen ? (
        <aside aria-label="Projetos" className="flex h-full w-72 shrink-0 flex-col pt-2.5 pr-2 pb-2 text-sidebar-foreground">
          <ProjectsPanel />
        </aside>
      ) : null}
      <main className="sky-card relative isolate my-2 mr-2 flex h-[calc(100vh-1rem)] min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-h2 bg-background">
        <Sky scene={sky} />
        <header className="relative z-[1] flex h-14 shrink-0 items-center gap-2 border-b border-h1 px-6">
          {bar ?? (area ? <PageTrail steps={[{ label: area.title }]} /> : null)}
        </header>
        <div className="relative z-[1] flex min-h-0 flex-1">
          {fill ? (
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
          ) : (
            <div className="quiet-scroll flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">{children}</div>
          )}
          {rail}
        </div>
        {layer ? <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-[inherit]">{layer}</div> : null}
      </main>
      {side}
    </div>
  );
}
