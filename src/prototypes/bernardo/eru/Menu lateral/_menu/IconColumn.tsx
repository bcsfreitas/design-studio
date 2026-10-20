// The icon column, copied from the prototype's shell (IconNav) so it can change here first. Besides the live hover,
// focus, tooltips and the cards of the usage meters and the gear, it can hold one of them still (`preview`), so a board
// can show every interaction side by side.
import { useId, useState, type ReactElement, type ReactNode } from 'react';
import { Link } from '@module/prototypes';
import { cn } from '#studio/runtime';
import { Button } from '@/systems/eru/components/button';
import { Diamond } from '@/systems/eru/components/diamond';
import { Popover, PopoverClose, PopoverPopup, PopoverTitle, PopoverTrigger } from '@/systems/eru/components/popover';
import { Tooltip, TooltipPopup, TooltipTrigger } from '@/systems/eru/components/tooltip';
import { Gauge, Plus, Settings, X } from '@/systems/eru/libraries/icons';
import { ProviderIcon } from '../../_components/shell/ProviderIcon';
import { AccountSettings, CONNECTION, PLUGIN, type AccountState } from './AccountSettings';
import { AREAS, NEW_SESSION_TO, type MenuPlace } from './areas';
import { AllProviders, Bars, cardRemaining, OneProvider, READING, tightestWindow, type UsageCard, type UsageReading } from './usage';

export type MenuItemKey = MenuPlace | 'perfil' | 'ajustes' | 'uso' | `uso:${string}`;

export interface MenuPreview {
  hover?: MenuItemKey;
  focus?: MenuItemKey;
  tip?: MenuItemKey;
  /** The card held open: 'ajustes', a provider's meter (`uso:anthropic`) or the gauge of all providers ('uso'). */
  open?: MenuItemKey;
  /** The usage card held while it reads again. */
  refreshing?: boolean;
}

const MAX_METERS = 3;

const ITEM =
  'group/item relative flex size-10 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none aria-[current=page]:text-foreground aria-expanded:bg-sidebar-accent aria-expanded:text-gold-text motion-reduce:transition-none [&_svg]:size-[1.125rem] data-hover:bg-sidebar-accent data-hover:text-sidebar-accent-foreground data-focus:ring-2 data-focus:ring-sidebar-ring';

const NEW_SESSION =
  'group/item relative flex size-10 cursor-pointer items-center justify-center rounded-full text-gold-text transition-colors duration-150 hover:bg-tint/12 focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none motion-reduce:transition-none [&_svg.lucide]:size-[1.125rem] data-hover:bg-tint/12 data-focus:ring-2 data-focus:ring-sidebar-ring';

const METER =
  'relative flex w-10 cursor-pointer flex-col items-center gap-1.5 rounded-lg pt-2 pb-1.5 transition-colors duration-150 hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none data-popup-open:bg-sidebar-accent motion-reduce:transition-none data-focus:ring-2 data-focus:ring-sidebar-ring data-hover:bg-sidebar-accent';

const GAUGE =
  'relative flex size-10 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors duration-150 hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none data-popup-open:bg-sidebar-accent motion-reduce:transition-none data-focus:ring-2 data-focus:ring-sidebar-ring data-hover:bg-sidebar-accent';

const GEAR =
  'flex size-10 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none data-popup-open:bg-sidebar-accent data-popup-open:text-foreground motion-reduce:transition-none data-focus:ring-2 data-focus:ring-sidebar-ring data-hover:bg-sidebar-accent data-hover:text-sidebar-accent-foreground';

const TIP = 'pointer-events-none absolute top-1/2 left-full z-20 ml-2.5 -translate-y-1/2 rounded-lg border border-h2 bg-popover px-2 py-1 font-sans text-xs font-normal tracking-normal whitespace-nowrap normal-case text-popover-foreground shadow-md/5';

const USAGE_POPUP = 'w-[min(24rem,calc(100vw-1.5rem))] overflow-hidden *:data-[slot=popover-viewport]:p-0';

/** The surface of a held card: the popover's own look, drawn beside its trigger (side right, aligned to its foot). */
const STILL_CARD = 'absolute bottom-0 left-full z-30 ml-3 overflow-hidden rounded-xl border border-h2 bg-popover text-left font-sans font-normal tracking-normal normal-case text-popover-foreground shadow-card';

/** The still tooltip of a board: the same popup as the live one, drawn in place. */
function StillTip({ children }: { children: ReactNode }) {
  return (
    <span role="tooltip" className={TIP}>
      {children}
    </span>
  );
}

const stillTitle = (children: ReactNode) => <h2 className="truncate text-sm leading-none font-semibold">{children}</h2>;
const liveTitle = (children: ReactNode) => <PopoverTitle className="truncate text-sm">{children}</PopoverTitle>;

function Hint({ label, still, children }: { label: string; still: boolean; children: ReactElement }) {
  if (still) return children;
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

type Flags = (key: MenuItemKey) => { 'data-hover'?: ''; 'data-focus'?: ''; tip: boolean };

interface FootProps {
  reading: UsageReading;
  profile: string;
  flags: Flags;
  preview?: MenuPreview;
}

function meterLabel(card: UsageCard) {
  const remaining = cardRemaining(card);
  const tightest = tightestWindow(card);
  return remaining === null ? `Uso de ${card.name}: sem medidor` : `Uso de ${card.name}: ${remaining}% restante${tightest ? ` (${tightest.label})` : ''}`;
}

function meterTitle(card: UsageCard) {
  const remaining = cardRemaining(card);
  return remaining === null ? card.name : `${card.name}: ${remaining}% restante`;
}

/** The usage at the foot of the column: a meter per provider, each opening its own card; with none, a gauge opens all. */
function UsageRail({ reading, profile, flags, preview }: FootProps) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const cards = reading.cards.slice(0, MAX_METERS);
  const still = preview !== undefined;

  if (cards.length === 0) {
    const { tip, ...state } = flags('uso');
    const held = preview?.open === 'uso';
    if (still) {
      return (
        <div className="relative">
          <button type="button" aria-label="Uso dos modelos: sem medidor" data-popup-open={held ? '' : undefined} className={GAUGE} {...state}>
            <Gauge aria-hidden className="size-[1.125rem]" />
            {tip ? <StillTip>Uso dos modelos</StillTip> : null}
          </button>
          {held ? (
            <div className={cn(STILL_CARD, 'w-96')}>
              <AllProviders reading={reading} profile={profile} title={stillTitle} />
            </div>
          ) : null}
        </div>
      );
    }
    return (
      <Popover open={openKey !== null} onOpenChange={open => setOpenKey(open ? 'todos' : null)}>
        <PopoverTrigger aria-label="Uso dos modelos: sem medidor" title="Uso dos modelos" className={GAUGE}>
          <Gauge aria-hidden className="size-[1.125rem]" />
        </PopoverTrigger>
        <PopoverPopup side="right" align="end" sideOffset={12} className={USAGE_POPUP}>
          <AllProviders reading={reading} profile={profile} title={liveTitle} />
        </PopoverPopup>
      </Popover>
    );
  }

  return (
    <div role="group" aria-label="Uso dos modelos" className="flex flex-col items-center gap-1">
      {cards.map(card => {
        const key = `uso:${card.provider}` as const;
        if (still) {
          const { tip, ...state } = flags(key);
          const held = preview?.open === key;
          return (
            <div key={card.provider} className="relative">
              <button type="button" aria-label={meterLabel(card)} data-popup-open={held ? '' : undefined} className={METER} {...state}>
                <ProviderIcon provider={card.provider} name={card.name} className="size-[1.125rem]" />
                <Bars remaining={cardRemaining(card)} />
                {tip ? <StillTip>{meterTitle(card)}</StillTip> : null}
              </button>
              {held ? (
                <div className={cn(STILL_CARD, 'w-96')}>
                  <OneProvider card={card} reading={reading} title={stillTitle} refreshing={preview?.refreshing} />
                </div>
              ) : null}
            </div>
          );
        }
        return (
          <Popover key={card.provider} open={openKey === key} onOpenChange={open => setOpenKey(open ? key : null)}>
            <PopoverTrigger aria-label={meterLabel(card)} title={meterTitle(card)} className={METER}>
              <ProviderIcon provider={card.provider} name={card.name} className="size-[1.125rem]" />
              <Bars remaining={cardRemaining(card)} />
            </PopoverTrigger>
            <PopoverPopup side="right" align="end" sideOffset={12} className={USAGE_POPUP}>
              <OneProvider card={card} reading={reading} title={liveTitle} />
            </PopoverPopup>
          </Popover>
        );
      })}
    </div>
  );
}

/** The dots on the gear's corner when the connection or the eru plugin is not well. */
function StatusDots({ account, id }: { account: AccountState; id: string }) {
  const link = CONNECTION[account.connection ?? 'open'];
  const eru = PLUGIN[account.plugin ?? 'ok'];
  return (
    <span id={id} className="pointer-events-none absolute top-1.5 right-1.5 flex gap-0.5">
      {link.healthy ? null : <span aria-hidden title={link.label} className={cn('block size-2 rounded-full ring-2 ring-sidebar', link.dot)} />}
      {eru.healthy ? null : <span aria-hidden title={eru.label} className={cn('block size-2 rounded-full ring-2 ring-sidebar', eru.dot)} />}
      <span className="sr-only">
        {link.label}. {eru.label}.
      </span>
    </span>
  );
}

function AccountHeader({ title, close }: { title: ReactNode; close: ReactNode }) {
  return (
    <header className="flex shrink-0 items-center justify-between gap-2 py-2 pr-2 pl-4">
      {title}
      {close}
    </header>
  );
}

/** The gear at the foot of the column: opens Ajustes e conta anchored to it. */
function AccountMenu({ reading, flags, preview, account }: FootProps & { account: AccountState }) {
  const statusId = useId();
  const { tip, ...state } = flags('ajustes');
  const settings = { usage: reading.cards, ...account };

  if (preview !== undefined) {
    const held = preview.open === 'ajustes';
    return (
      <div className="relative">
        <button type="button" aria-label="Ajustes e conta" aria-describedby={statusId} data-popup-open={held ? '' : undefined} className={GEAR} {...state}>
          <Settings aria-hidden className="size-[1.125rem]" />
          {tip ? <StillTip>Ajustes e conta</StillTip> : null}
        </button>
        <StatusDots account={account} id={statusId} />
        {held ? (
          <div className={cn(STILL_CARD, 'flex w-[22rem] flex-col')}>
            <AccountHeader
              title={<h2 className="text-base leading-none font-semibold">Ajustes e conta</h2>}
              close={
                <Button variant="ghost" size="icon-sm" aria-label="Fechar">
                  <X aria-hidden />
                </Button>
              }
            />
            <div className="px-2.5 pb-2.5">
              <AccountSettings {...settings} />
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <Popover>
      <div className="relative">
        <Hint label="Ajustes e conta" still={false}>
          <PopoverTrigger aria-label="Ajustes e conta" aria-describedby={statusId} className={GEAR}>
            <Settings aria-hidden className="size-[1.125rem]" />
          </PopoverTrigger>
        </Hint>
        <StatusDots account={account} id={statusId} />
      </div>
      <PopoverPopup side="right" align="end" sideOffset={12} className="w-[22rem] *:data-[slot=popover-viewport]:p-0">
        <div className="flex max-h-[calc(var(--available-height)-2px)] flex-col">
          <AccountHeader
            title={<PopoverTitle className="text-base">Ajustes e conta</PopoverTitle>}
            close={
              <PopoverClose render={<Button variant="ghost" size="icon-sm" aria-label="Fechar" />}>
                <X aria-hidden />
              </PopoverClose>
            }
          />
          <div className="pop-scroll min-h-0 px-2.5 pb-2.5">
            <AccountSettings {...settings} />
          </div>
        </div>
      </PopoverPopup>
    </Popover>
  );
}

export interface IconColumnProps {
  current?: MenuPlace;
  projectsOpen?: boolean;
  onToggleProjects?: () => void;
  /** Keeps the clicks on the page: the areas mark themselves instead of opening their screens. */
  onSelect?: (place: MenuPlace) => void;
  preview?: MenuPreview;
  usage?: UsageReading;
  /** How Ajustes e conta starts: the connection, the plugin, the light, the sky. */
  account?: AccountState;
  profile?: string;
}

export function IconColumn({ current, projectsOpen = false, onToggleProjects, onSelect, preview, usage = READING, account = {}, profile = 'default' }: IconColumnProps) {
  const flags: Flags = key => ({
    'data-hover': preview?.hover === key ? '' : undefined,
    'data-focus': preview?.focus === key ? '' : undefined,
    tip: preview?.tip === key,
  });
  const still = preview !== undefined;

  const place = (key: MenuPlace, label: string, className: string, content: ReactNode, to?: string) => {
    const { tip, ...state } = flags(key);
    const inner = (
      <>
        {content}
        <CurrentMark />
        {tip ? <StillTip>{label}</StillTip> : null}
      </>
    );
    const common = { 'aria-label': label, 'aria-current': current === key ? ('page' as const) : undefined, className, ...state };
    if (onSelect || still || !to) {
      return (
        <button type="button" {...common} onClick={() => onSelect?.(key)}>
          {inner}
        </button>
      );
    }
    return (
      <Link to={to} {...common}>
        {inner}
      </Link>
    );
  };

  const profileState = flags('perfil');

  return (
    <div className="flex h-full w-16 shrink-0 flex-col items-center gap-3 py-3 text-sidebar-foreground">
      <button
        type="button"
        aria-label="Perfil ativo"
        title={still ? undefined : `Perfil: ${profile}`}
        data-hover={profileState['data-hover']}
        data-focus={profileState['data-focus']}
        className="relative flex size-9 cursor-pointer items-center justify-center rounded-full border border-h3 font-display text-[17px] font-medium text-ink uppercase transition-opacity duration-150 hover:opacity-85 focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none data-focus:ring-2 data-focus:ring-sidebar-ring data-hover:opacity-85"
      >
        <span aria-hidden>{profile.charAt(0)}</span>
        {profileState.tip ? <StillTip>Perfil: {profile}</StillTip> : null}
      </button>
      <nav aria-label="Navegação" className="flex flex-col items-center gap-1">
        <Hint label="Nova sessão" still={still}>
          {place(
            'nova-sessao',
            'Nova sessão',
            NEW_SESSION,
            <>
              <NewSessionRings />
              <Plus aria-hidden strokeWidth={1.5} />
            </>,
            NEW_SESSION_TO,
          )}
        </Hint>
        {(['principal', 'mais'] as const).map(group => (
          <div key={group} className="contents">
            <NavSeparator />
            <div role="group" aria-label={group === 'principal' ? 'Principal' : 'Mais'} className="flex flex-col items-center gap-1">
              {AREAS.filter(area => area.group === group).map(area => {
                if (area.id === 'sessoes') {
                  const { tip, ...state } = flags('sessoes');
                  return (
                    <Hint key={area.id} label="Sessões recentes" still={still}>
                      <button
                        type="button"
                        aria-label="Sessões recentes"
                        aria-expanded={projectsOpen}
                        aria-current={current === 'sessoes' ? 'page' : undefined}
                        onClick={onToggleProjects}
                        className={ITEM}
                        {...state}
                      >
                        <area.icon aria-hidden />
                        <CurrentMark />
                        {tip ? <StillTip>Sessões recentes</StillTip> : null}
                      </button>
                    </Hint>
                  );
                }
                if (!area.to) {
                  const { tip, ...state } = flags(area.id);
                  return (
                    <Hint key={area.id} label={area.title} still={still}>
                      <span role="link" aria-disabled aria-label={area.title} className={cn(ITEM, 'cursor-default opacity-60')} {...state}>
                        <area.icon aria-hidden />
                        {tip ? <StillTip>{area.title}</StillTip> : null}
                      </span>
                    </Hint>
                  );
                }
                return (
                  <Hint key={area.id} label={area.title} still={still}>
                    {place(area.id, area.title, ITEM, <area.icon aria-hidden />, area.to)}
                  </Hint>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="mt-auto flex flex-col items-center gap-2">
        <UsageRail reading={usage} profile={profile} flags={flags} preview={preview} />
        <AccountMenu reading={usage} profile={profile} flags={flags} preview={preview} account={account} />
      </div>
    </div>
  );
}
