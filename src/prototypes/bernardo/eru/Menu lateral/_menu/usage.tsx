// The usage of the models, from eru features/usage: the sample readings, the bars under each provider in the icon
// column, the card a meter opens (one provider), the card the gauge opens when no provider has a meter (all of them), and
// the rows of Ajustes e conta. The readings are fixed; "Atualizar" only pretends to read again.
import { useEffect, useId, useState, type ReactNode } from 'react';
import { cn } from '#studio/runtime';
import { Button } from '@/systems/eru/components/button';
import { Gauge, RefreshCw } from '@/systems/eru/libraries/icons';
import { ProviderIcon } from '../../_components/shell/ProviderIcon';

export const SEGMENTS = 5;

export type Band = 'folga' | 'apertado' | 'critico';

export interface UsageWindow {
  label: string;
  /** What is left, 0 to 100; null when the window reset after the reading. */
  remaining: number | null;
  /** How long until it resets: "4h 5min", "6d 7h". */
  resets?: string;
}

export interface UsageCard {
  provider: string;
  name: string;
  plan?: string;
  windows: UsageWindow[];
  /** How old the reading is, when the quota plugin could not read it again. */
  stale?: string;
  /** The provider stopped answering because a limit was hit. */
  limit?: string;
  notes?: string[];
  /** API spend in the last 30 days, in dollars. */
  spend?: number;
}

export interface QuietProvider {
  provider: string;
  name: string;
  reason: string;
}

export interface UsageReading {
  cards: UsageCard[];
  quiet?: QuietProvider[];
  /** How long ago the reading was made. */
  readAgo?: string;
  /** Why only part of the usage shows up. */
  note?: string;
  /** "Atualizar" failed with this message. */
  failure?: string;
  /** Still reading, with nothing to show yet. */
  pending?: boolean;
}

export const ANTHROPIC: UsageCard = {
  provider: 'anthropic',
  name: 'Anthropic',
  plan: 'Max 20x',
  windows: [
    { label: '5 horas', remaining: 92, resets: '3h 12min' },
    { label: 'Semanal', remaining: 64, resets: '4d 9h' },
    { label: 'Opus · semanal', remaining: 71, resets: '4d 9h' },
  ],
};

export const OPENAI: UsageCard = {
  provider: 'openai',
  name: 'OpenAI',
  plan: 'Plus · 3 resets',
  windows: [
    { label: '5 horas', remaining: 100, resets: '5h' },
    { label: 'Semanal', remaining: 99, resets: '6d 7h' },
  ],
  spend: 4.82,
};

export const QUIET: QuietProvider[] = [
  { provider: 'openrouter', name: 'OpenRouter', reason: 'Credits balance: $0.00' },
  { provider: 'zai', name: 'Z.ai', reason: 'sem credenciais' },
];

export const READING: UsageReading = { cards: [ANTHROPIC, OPENAI], quiet: QUIET, readAgo: 'há 3 min' };

/** A card with every window at the same level, for the boards of the bands. */
export function cardAt(base: UsageCard, remaining: number): UsageCard {
  const [first, ...rest] = base.windows;
  return { ...base, windows: [{ ...first, remaining }, ...rest.map(window => ({ ...window, remaining: Math.max(remaining, window.remaining ?? 0) }))] };
}

const FILL: Record<Band, string> = { folga: 'bg-success', apertado: 'bg-warning', critico: 'bg-destructive' };

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'USD' });

export const bandOf = (remaining: number): Band => (remaining < 20 ? 'critico' : remaining < 50 ? 'apertado' : 'folga');

export const filledSegments = (remaining: number) => (remaining <= 0 ? 0 : Math.min(SEGMENTS, Math.max(1, Math.round(remaining / (100 / SEGMENTS)))));

/** What is left in the tightest window: what the bars of the column show. */
export function cardRemaining(card: UsageCard): number | null {
  const known = card.windows.map(window => window.remaining).filter((value): value is number => value !== null);
  return known.length ? Math.min(...known) : null;
}

export const tightestWindow = (card: UsageCard) => card.windows.find(window => window.remaining === cardRemaining(card));

/** The bars under a provider's logo in the icon column. */
export function Bars({ remaining }: { remaining: number | null }) {
  const filled = remaining === null ? 0 : filledSegments(remaining);
  const fill = remaining === null ? '' : FILL[bandOf(remaining)];
  return (
    <span aria-hidden className="flex items-end gap-[2px]">
      {Array.from({ length: SEGMENTS }, (_, index) => (
        <span key={index} className={cn('h-2.5 w-[3px] rounded-full', index < filled ? fill : 'bg-foreground/15')} />
      ))}
    </span>
  );
}

function Segments({ remaining }: { remaining: number | null }) {
  const filled = remaining === null ? 0 : filledSegments(remaining);
  const fill = remaining === null ? '' : FILL[bandOf(remaining)];
  return (
    <span aria-hidden className="flex shrink-0 items-center gap-[3px]">
      {Array.from({ length: SEGMENTS }, (_, index) => (
        <span key={index} className={cn('size-[7px] rounded-[2px]', index < filled ? fill : 'bg-foreground/12')} />
      ))}
    </span>
  );
}

function WindowRow({ window }: { window: UsageWindow }) {
  const band = window.remaining === null ? undefined : bandOf(window.remaining);
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto_5.75rem] items-center gap-3 py-1">
      <span className="flex min-w-0 items-baseline gap-2">
        <span className="truncate text-[13px] font-medium">{window.label}</span>
        <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">{window.remaining === null ? 'já zerou' : window.resets}</span>
      </span>
      <Segments remaining={window.remaining} />
      <span className="flex items-baseline justify-end gap-1">
        <span className={cn('text-base leading-none font-semibold tabular-nums', band === 'critico' && 'text-destructive-foreground', window.remaining === null && 'text-muted-foreground')}>
          {window.remaining === null ? '—' : `${window.remaining}%`}
        </span>
        <span className="text-[11px] text-muted-foreground">restante</span>
      </span>
    </li>
  );
}

function Pill({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('shrink-0 rounded-full bg-foreground/8 px-1.5 py-0.5 text-[11px] leading-none font-medium text-muted-foreground', className)}>{children}</span>;
}

function CardPills({ card }: { card: UsageCard }) {
  return (
    <>
      {card.plan ? <Pill>{card.plan}</Pill> : null}
      {card.stale ? <Pill className="ml-auto bg-warning/12 text-warning-foreground">leitura de {card.stale}</Pill> : null}
    </>
  );
}

export function CardWindows({ card }: { card: UsageCard }) {
  return (
    <>
      {card.limit ? <p className="mt-1 text-xs font-medium text-destructive-foreground">{card.limit}</p> : null}
      {card.windows.length > 0 ? (
        <ul className="mt-0.5">
          {card.windows.map(window => (
            <WindowRow key={window.label} window={window} />
          ))}
        </ul>
      ) : null}
      {(card.notes ?? []).map(note => (
        <p key={note} className="mt-1 text-[11px] text-muted-foreground">
          {note}
        </p>
      ))}
    </>
  );
}

/** Pretends to read the usage again: the button spins for a moment. */
function useRefresh() {
  const [pending, setPending] = useState(false);
  useEffect(() => {
    if (!pending) return;
    const timer = window.setTimeout(() => setPending(false), 1400);
    return () => window.clearTimeout(timer);
  }, [pending]);
  return [pending, () => setPending(true)] as const;
}

/** What closes every usage card: the reading notes, the refresh error and the button with the age of the reading. */
function UsageFooter({ reading, refreshing }: { reading: UsageReading; refreshing?: boolean }) {
  const [pending, refresh] = useRefresh();
  const busy = pending || refreshing;
  return (
    <>
      {reading.note || reading.failure ? (
        <div className="flex flex-col gap-1 px-4 pb-2.5">
          {reading.note ? <p className="text-[11px] text-muted-foreground">{reading.note}</p> : null}
          {reading.failure ? (
            <p role="alert" className="text-[11px] text-destructive-foreground">
              {reading.failure}
            </p>
          ) : null}
        </div>
      ) : null}
      <footer className="flex items-center gap-2 border-t px-2.5 py-2">
        <Button variant="ghost" size="xs" onClick={refresh} disabled={busy}>
          <RefreshCw aria-hidden className={cn(busy && 'animate-spin motion-reduce:animate-none')} />
          {busy ? 'Atualizando…' : 'Atualizar'}
        </Button>
        {reading.readAgo ? <span className="text-[11px] text-muted-foreground">lido {busy ? 'agora' : reading.readAgo}</span> : null}
      </footer>
    </>
  );
}

/** One provider, opened by its meter in the icon column: its windows, its API spend and Atualizar. */
export function OneProvider({ card, reading, title, refreshing }: { card: UsageCard; reading: UsageReading; title: (children: ReactNode) => ReactNode; refreshing?: boolean }) {
  return (
    <div className="flex max-h-[min(40rem,calc(100dvh-2rem))] flex-col">
      <header className="flex min-w-0 items-center gap-2 px-4 pt-3.5 pb-1">
        <ProviderIcon provider={card.provider} name={card.name} className="size-4" />
        {title(card.name)}
        <CardPills card={card} />
      </header>
      <div className="min-h-0 overflow-y-auto overscroll-contain px-4 pb-3">
        <CardWindows card={card} />
        {card.spend !== undefined ? (
          <p className="mt-2 flex items-baseline gap-1.5 border-t pt-2 text-[13px]">
            <span className="flex-1 font-medium">Gasto de API</span>
            <span className="text-base leading-none font-semibold tabular-nums">{money.format(card.spend)}</span>
            <span className="text-[11px] text-muted-foreground">em 30 dias</span>
          </p>
        ) : null}
      </div>
      <UsageFooter reading={reading} refreshing={refreshing} />
    </div>
  );
}

function ProviderCard({ card }: { card: UsageCard }) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className="rounded-lg bg-muted px-3 py-2.5 ring-1 ring-h1">
      <header className="flex min-w-0 items-center gap-2">
        <ProviderIcon provider={card.provider} name={card.name} className="size-3.5" />
        <h3 id={titleId} className="truncate text-sm font-semibold">
          {card.name}
        </h3>
        <CardPills card={card} />
      </header>
      <div className="pl-5.5">
        <CardWindows card={card} />
      </div>
    </section>
  );
}

/** Every provider of the profile, opened by the gauge when no provider has a meter. */
export function AllProviders({ reading, profile, title }: { reading: UsageReading; profile: string; title: (children: ReactNode) => ReactNode }) {
  const quiet = reading.quiet ?? [];
  const empty = !reading.pending && reading.cards.length === 0 && quiet.length === 0;
  return (
    <div className="flex max-h-[min(40rem,calc(100dvh-2rem))] flex-col">
      <header className="flex items-baseline justify-between gap-2 px-4 pt-3.5 pb-2">
        {title('Uso dos modelos')}
        <span className="truncate text-[11px] text-muted-foreground">perfil {profile}</span>
      </header>
      <div className="flex min-h-0 flex-col gap-2 overflow-y-auto overscroll-contain px-2.5 pb-2.5">
        {reading.cards.map(card => (
          <ProviderCard key={card.provider} card={card} />
        ))}
        {quiet.length > 0 ? (
          <section className="rounded-lg px-3 py-2 ring-1 ring-h1">
            <h3 className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Sem medidor</h3>
            <ul className="mt-1">
              {quiet.map(provider => (
                <li key={provider.provider} className="flex min-w-0 items-center gap-2 py-1 text-xs">
                  <ProviderIcon provider={provider.provider} name={provider.name} className="size-3.5" />
                  <span className="max-w-[45%] shrink-0 truncate font-medium">{provider.name}</span>
                  <span className="truncate text-muted-foreground">{provider.reason}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {reading.pending ? <p className="px-2 py-6 text-center text-sm text-muted-foreground">Lendo o uso…</p> : null}
        {empty ? <p className="px-2 py-6 text-center text-sm text-muted-foreground">Nenhum provedor configurado neste perfil.</p> : null}
      </div>
      <UsageFooter reading={reading} />
    </div>
  );
}

/** A provider's row in Ajustes e conta: what is left in the tightest window; a click opens its windows right there. */
function UsageRow({ card, open, onToggle }: { card: UsageCard; open: boolean; onToggle: () => void }) {
  const remaining = cardRemaining(card);
  const tightest = tightestWindow(card);
  const id = useId();
  return (
    <li>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={onToggle}
        className="flex min-h-11 w-full min-w-0 cursor-pointer items-center gap-3 px-3 py-2.5 text-left transition-colors duration-150 hover:bg-foreground/4 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset motion-reduce:transition-none"
      >
        <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-foreground/6">
          <ProviderIcon provider={card.provider} name={card.name} className="size-4" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-medium">Uso do {card.name}</span>
          <span className="truncate text-xs text-muted-foreground">{tightest ? tightest.label : 'sem medidor'}</span>
        </span>
        {remaining === null ? null : (
          <span className={cn('shrink-0 text-[13px] font-medium tabular-nums', bandOf(remaining) === 'critico' ? 'text-destructive-foreground' : 'text-muted-foreground')}>
            {remaining}%<span className="sr-only"> restante</span>
          </span>
        )}
      </button>
      {open ? (
        <div id={id} className="px-3 pb-2.5 pl-14">
          <CardWindows card={card} />
        </div>
      ) : null}
    </li>
  );
}

/** The usage of each provider as rows of Ajustes e conta; with no meter, one row says so. */
export function UsageRows({ cards, openFirst = false }: { cards: UsageCard[]; openFirst?: boolean }) {
  const [openKey, setOpenKey] = useState<string | null>(openFirst ? (cards[0]?.provider ?? null) : null);
  if (cards.length === 0) {
    return (
      <li className="flex min-h-11 items-center gap-3 px-3 py-2.5">
        <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-foreground/6 text-muted-foreground">
          <Gauge className="size-4" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-medium">Uso dos modelos</span>
          <span className="truncate text-xs text-muted-foreground">Nenhum provedor com medidor neste perfil</span>
        </span>
      </li>
    );
  }
  return cards.map(card => <UsageRow key={card.provider} card={card} open={openKey === card.provider} onToggle={() => setOpenKey(openKey === card.provider ? null : card.provider)} />);
}
