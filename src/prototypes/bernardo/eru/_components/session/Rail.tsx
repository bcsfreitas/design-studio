// The session rail: the icon column on the card's right edge and the open panel beside the card, ported from eru
// features/rail (Rail.tsx, SessionToolbar.tsx, SessionSide.tsx, PanelTabs.tsx, rail-panels.tsx).
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { cn } from '#studio/runtime';
import { Button } from '@/systems/eru/components/button';
import { TabsPrimitive } from '@/systems/eru/components/tabs';
import { Tooltip, TooltipPopup, TooltipTrigger } from '@/systems/eru/components/tooltip';
import { Bot, FolderOpen, Globe, Plus, SquareTerminal, X, type LucideIcon } from '@/systems/eru/libraries/icons';
import styles from './session.module.css';

export type PanelId = 'navegador' | 'terminal' | 'arquivos' | 'agentes';

export interface RailPanel {
  id: PanelId;
  label: string;
  icon: LucideIcon;
  /** Wider than the default on big screens, for a page or a terminal. */
  wide?: boolean;
}

export const RAIL_PANELS: readonly RailPanel[] = [
  { id: 'navegador', label: 'Navegador', icon: Globe, wide: true },
  { id: 'terminal', label: 'Terminal', icon: SquareTerminal, wide: true },
  { id: 'arquivos', label: 'Arquivos', icon: FolderOpen },
  { id: 'agentes', label: 'Agentes', icon: Bot },
];

const BUTTON =
  'relative flex size-8 cursor-pointer items-center justify-center rounded-lg text-dim transition-colors duration-[120ms] ease-(--ease) hover:bg-sidebar-accent hover:text-ink focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none aria-expanded:bg-sidebar-accent aria-expanded:text-gold-text motion-reduce:transition-none';

/** The icon column, one button per panel, inside the main card on the right and 12 px below the bar. */
export function Rail({ openId, running, onToggle }: { openId: PanelId | null; running: number; onToggle: (id: PanelId) => void }) {
  return (
    <nav aria-label="Trilho" className="absolute top-3 right-4 z-10 flex flex-col gap-1">
      {RAIL_PANELS.map(panel => (
        <Tooltip key={panel.id}>
          <TooltipTrigger
            render={
              <button type="button" data-trilho={panel.id} aria-expanded={openId === panel.id} aria-controls={openId === panel.id ? `painel-do-trilho-${panel.id}` : undefined} onClick={() => onToggle(panel.id)} className={BUTTON}>
                <panel.icon aria-hidden className="size-[17px]" />
                <span className="sr-only">{panel.label}</span>
                {panel.id === 'agentes' && running > 0 ? (
                  <span className="pointer-events-none absolute top-0.5 right-px">
                    <span aria-hidden className="block min-w-[13px] text-center font-mono text-[9px] leading-[13px] font-semibold text-gold-text tabular-nums">
                      {running}
                    </span>
                    <span className="sr-only">, {running} rodando</span>
                  </span>
                ) : null}
              </button>
            }
          />
          <TooltipPopup side="left">
            <span className="font-medium">{panel.label}</span>
          </TooltipPopup>
        </Tooltip>
      ))}
    </nav>
  );
}

/** What the panel card puts at the ends of a panel's own header: the close button, on the computer. */
const PanelChromeContext = createContext<{ end?: ReactNode }>({});

const defaultWidth = (wide: boolean | undefined) => (!wide || window.innerWidth < 1280 ? 320 : window.innerWidth < 1536 ? 480 : 640);

/**
 * The open panel on a wide screen: a card with radius 12 and an --h2 border on the right, outside the main card. It slides in
 * from the right edge when it opens; switching panels is instant.
 */
export function PanelCard({ panel, onClose, children }: { panel: RailPanel; onClose: () => void; children: ReactNode }) {
  const [width, setWidth] = useState(() => defaultWidth(panel.wide));

  useEffect(() => {
    setWidth(defaultWidth(panel.wide));
  }, [panel.wide]);

  const close = (
    <Button variant="ghost" size="icon-sm" aria-label={`Fechar ${panel.label.toLowerCase()}`} title="Fechar" className="shrink-0" onClick={onClose}>
      <X aria-hidden />
    </Button>
  );

  return (
    <div
      className={cn(styles.panelIn, 'relative flex h-full shrink-0 bg-sidebar')}
      onKeyDown={event => {
        if (event.key === 'Escape') onClose();
      }}
    >
      <div style={{ width }} className="my-2 mr-2 flex min-h-0 shrink-0 flex-col overflow-hidden rounded-2xl border border-h2 bg-card max-lg:shadow-card">
        <aside id={`painel-do-trilho-${panel.id}`} aria-label={panel.label} className="pointer-events-auto flex min-h-0 w-full flex-1 flex-col overflow-hidden text-foreground">
          <PanelChromeContext value={{ end: close }}>
            <div className="flex min-h-0 flex-1 flex-col">{children}</div>
          </PanelChromeContext>
        </aside>
      </div>
    </div>
  );
}

export interface PanelTab {
  id: string;
  label: string;
  title?: string;
  leading?: ReactNode;
  fixed?: boolean;
}

/** The header of a rail panel with several instances: the tabs, the button to open another and the close button at the end. */
export function PanelTabs({
  label,
  tabs,
  active,
  onSelect,
  onClose,
  onAdd,
  addLabel,
  variant = 'pills',
  children,
}: {
  label: string;
  tabs: readonly PanelTab[];
  active: string | null;
  onSelect: (id: string) => void;
  onClose?: (id: string) => void;
  onAdd?: () => void;
  addLabel?: string;
  variant?: 'pills' | 'browser';
  children?: ReactNode;
}) {
  const browser = variant === 'browser';
  const chrome = useContext(PanelChromeContext);

  return (
    <TabsPrimitive.Root value={active} onValueChange={value => onSelect(String(value))} className="flex min-h-0 flex-1 flex-col">
      <div className={cn('flex shrink-0 items-center gap-1 border-b px-1', browser ? 'min-h-8' : 'min-h-10')}>
        <div className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto [scrollbar-width:none]">
          <TabsPrimitive.List aria-label={label} className={cn('flex items-center', !browser && 'gap-0.5')}>
            {tabs.map(tab => {
              const closable = Boolean(onClose) && !tab.fixed;
              return (
                <div
                  key={tab.id}
                  data-aba-do-painel={tab.id}
                  className={cn(
                    'group/aba flex shrink-0 items-center text-muted-foreground hover:text-sidebar-accent-foreground has-data-active:text-foreground',
                    browser ? 'h-8 border-b-2 border-transparent pt-0.5 hover:bg-sidebar-accent has-data-active:border-info' : 'h-7 rounded-md hover:bg-sidebar-accent has-data-active:bg-background has-data-active:shadow-xs/5',
                  )}
                >
                  <TabsPrimitive.Tab
                    value={tab.id}
                    title={tab.title ?? tab.label}
                    className={cn('flex h-full cursor-pointer items-center gap-1.5 rounded-md pl-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50', browser ? 'max-w-48' : 'max-w-44', closable ? 'pr-1' : 'pr-2')}
                  >
                    {tab.leading}
                    <span className="truncate">{tab.label}</span>
                  </TabsPrimitive.Tab>
                  {closable ? (
                    <button
                      type="button"
                      aria-label={`Fechar ${tab.label}`}
                      title="Fechar"
                      onClick={() => onClose?.(tab.id)}
                      className="mr-1 flex size-5 shrink-0 cursor-pointer items-center justify-center rounded text-muted-foreground opacity-0 group-hover/aba:opacity-100 group-has-data-active/aba:opacity-100 hover:bg-muted hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
                    >
                      <X aria-hidden className="size-3" />
                    </button>
                  ) : null}
                </div>
              );
            })}
          </TabsPrimitive.List>
          {onAdd ? (
            <button
              type="button"
              aria-label={addLabel}
              title={addLabel}
              onClick={onAdd}
              className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <Plus aria-hidden className="size-4" />
            </button>
          ) : null}
        </div>
        {chrome.end}
      </div>
      {children}
    </TabsPrimitive.Root>
  );
}

export function PanelTabContent({ value, className, children }: { value: string; className?: string; children: ReactNode }) {
  return (
    <TabsPrimitive.Panel value={value} keepMounted className={cn('flex min-h-0 flex-1 flex-col outline-none data-hidden:hidden', className)}>
      {children}
    </TabsPrimitive.Panel>
  );
}
