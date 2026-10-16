// The message field and its pickers, ported from eru features/turn (Composer, ContextMeter), features/model (ModelPicker,
// EffortPicker) and features/approval (ApprovalModePicker). Choices stay in local state.
import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type KeyboardEvent } from 'react';
import { cn } from '#studio/runtime';
import { Button } from '@/systems/eru/components/button';
import { Menu, MenuGroup, MenuGroupLabel, MenuPopup, MenuPrimitive, MenuRadioGroup, MenuSeparator, MenuTrigger } from '@/systems/eru/components/menu';
import { NotchDivider } from '@/systems/eru/components/notch';
import { Popover, PopoverPopup, PopoverTitle, PopoverTrigger } from '@/systems/eru/components/popover';
import { Textarea } from '@/systems/eru/components/textarea';
import { Tooltip, TooltipPopup, TooltipTrigger } from '@/systems/eru/components/tooltip';
import { ArrowUp, Brain, Check, CircleHelp, FolderOpen, Paperclip, Search, ShieldCheck, ShieldHalf, ShieldOff, Square, Zap, type LucideIcon } from '@/systems/eru/libraries/icons';
import { PROFILE } from '../data/workspace';
import { ProviderIcon } from '../shell/ProviderIcon';
import styles from './session.module.css';

export const PICKER_TRIGGER =
  'inline-flex h-8 cursor-pointer touch-manipulation items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-foreground transition-[background-color,color,transform] duration-180 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-muted active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 data-popup-open:bg-muted motion-reduce:transition-none motion-reduce:active:scale-100';

interface CatalogModel {
  id: string;
  label: string;
  short: string;
  reasoning: boolean;
  fast: boolean;
}

const CATALOG: { slug: string; name: string; models: CatalogModel[] }[] = [
  {
    slug: 'anthropic',
    name: 'Anthropic',
    models: [
      { id: 'claude-opus-5-5', label: 'Claude Opus 5.5', short: 'Opus 5.5', reasoning: true, fast: true },
      { id: 'claude-sonnet-5', label: 'Claude Sonnet 5', short: 'Sonnet 5', reasoning: true, fast: true },
      { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5', short: 'Haiku 4.5', reasoning: true, fast: false },
    ],
  },
  {
    slug: 'openai',
    name: 'OpenAI',
    models: [
      { id: 'gpt-5.5', label: 'GPT-5.5', short: 'GPT-5.5', reasoning: true, fast: true },
      { id: 'gpt-5.5-mini', label: 'GPT-5.5 mini', short: 'GPT-5.5 mini', reasoning: true, fast: false },
      { id: 'gpt-4.1', label: 'GPT-4.1', short: 'GPT-4.1', reasoning: false, fast: false },
    ],
  },
];

export interface ModelChoice {
  provider: string;
  model: string;
}

const findModel = (choice: ModelChoice) => CATALOG.find(row => row.slug === choice.provider)?.models.find(model => model.id === choice.model);

function Capabilities({ reasoning, fast }: { reasoning: boolean; fast: boolean }) {
  if (!reasoning && !fast) return null;

  return (
    <span aria-hidden className="flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1 ring-1 ring-border/70 ring-inset">
      {reasoning ? <Brain className="size-3 text-[#a78bfa]" /> : null}
      {reasoning && fast ? <span className="h-3 w-px bg-border" /> : null}
      {fast ? <Zap className="size-3 text-[#fbbf24]" /> : null}
    </span>
  );
}

/** The model picker: providers on the side and a search across all of them. On the Notch, only the logo and the short name. */
export function ModelPicker({ value, disabled = false, onChange }: { value: ModelChoice; disabled?: boolean; onChange: (choice: ModelChoice) => void }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState(value.provider);
  const [query, setQuery] = useState('');
  const search = useRef<HTMLInputElement>(null);
  const model = findModel(value);
  const provider = CATALOG.find(row => row.slug === value.provider)!;
  const needle = query.trim().toLowerCase();
  const groups = needle
    ? CATALOG.map(row => ({ provider: row, models: row.models.filter(item => item.id.includes(needle) || item.label.toLowerCase().includes(needle)) })).filter(group => group.models.length > 0)
    : [{ provider: CATALOG.find(row => row.slug === tab) ?? CATALOG[0], models: (CATALOG.find(row => row.slug === tab) ?? CATALOG[0]).models }];

  return (
    <Popover
      open={open}
      onOpenChange={next => {
        if (next) {
          setTab(value.provider);
          setQuery('');
        }
        setOpen(next);
      }}
    >
      <PopoverTrigger
        disabled={disabled}
        aria-label={`Modelo: ${model?.label}`}
        title={`Modelo desta sessão: ${model?.label} · ${provider.name} · ${value.model}`}
        className={cn(PICKER_TRIGGER, 'max-w-56 min-w-0 sm:max-w-72')}
      >
        <ProviderIcon provider={value.provider} name={provider.name} className="size-3.5" />
        <span className="min-w-0 truncate" translate="no">
          {model?.short}
        </span>
      </PopoverTrigger>
      <PopoverPopup side="top" align="start" sideOffset={8} initialFocus={search} className="w-[min(26rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl *:data-[slot=popover-viewport]:p-0">
        <div className="flex max-h-[min(28rem,calc(100dvh-7rem))]">
          <div role="tablist" aria-label="Provedores" aria-orientation="vertical" className="pop-scroll flex shrink-0 flex-col gap-1 border-r bg-muted/40 p-1.5 sm:p-2">
            {CATALOG.map(row => {
              const selected = !needle && groups[0]?.provider.slug === row.slug;
              return (
                <button
                  key={row.slug}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-label={row.name}
                  title={row.name}
                  onClick={() => {
                    setTab(row.slug);
                    setQuery('');
                  }}
                  className={cn(
                    'inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-popover/70 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none sm:size-10',
                    selected && 'bg-popover text-foreground ring-1 ring-border/60 ring-inset',
                  )}
                >
                  <ProviderIcon provider={row.slug} name={row.name} />
                </button>
              );
            })}
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <label className="flex items-center gap-2 border-b px-3 py-2.5">
              <Search aria-hidden className="size-4 shrink-0 text-muted-foreground" />
              <input
                ref={search}
                type="search"
                aria-label="Buscar modelos"
                placeholder="Buscar modelos"
                value={query}
                onChange={event => setQuery(event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
              />
            </label>
            <div className="pop-scroll relative min-h-0 flex-1 p-1.5">
              {groups.length === 0 ? (
                <p className="px-2.5 py-6 text-center text-sm text-muted-foreground">Nenhum modelo encontrado.</p>
              ) : (
                groups.map(group => (
                  <div key={group.provider.slug} role="group" aria-label={group.provider.name} className="flex flex-col gap-0.5">
                    <p className="px-2.5 pt-1.5 pb-1 font-mono text-[11px] text-muted-foreground uppercase">{group.provider.name}</p>
                    {group.models.map(item => {
                      const selected = value.provider === group.provider.slug && value.model === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => {
                            setOpen(false);
                            onChange({ provider: group.provider.slug, model: item.id });
                          }}
                          className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none aria-pressed:bg-accent motion-reduce:transition-none"
                        >
                          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                            <span className="flex items-center gap-1.5 text-sm font-medium">
                              <span className="truncate" translate="no">
                                {item.label}
                              </span>
                              {selected ? <Check aria-hidden className="size-3.5 shrink-0" /> : null}
                            </span>
                            <span className="truncate font-mono text-xs text-muted-foreground" translate="no">
                              {item.id}
                            </span>
                          </span>
                          <Capabilities reasoning={item.reasoning} fast={item.fast} />
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </PopoverPopup>
    </Popover>
  );
}

const LEVELS = [
  { value: 'low', label: 'Baixo' },
  { value: 'medium', label: 'Médio' },
  { value: 'high', label: 'Alto' },
  { value: 'xhigh', label: 'Extra' },
  { value: 'max', label: 'Máximo' },
  { value: 'ultra', label: 'Galáxia' },
] as const;

const LAST = LEVELS.length - 1;
const DEFAULT_LEVEL = 1;
const stopPosition = (index: number) => `${(index / LAST) * 100}%`;

function noise(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

const GALAXY_COLORS = ['#f472b6', '#e879f9', '#a78bfa', '#818cf8', '#67e8f9', '#5eead4', '#e9d5ff', '#f5f3ff'];

const GALAXY_PIXELS = Array.from({ length: 3 * 56 }, (_, cell) => {
  const progress = Math.floor(cell / 3) / 55;
  const lit = noise(cell + 1) < 0.3 + progress * 0.65;
  return {
    color: GALAXY_COLORS[Math.floor(noise(cell + 101) * GALAXY_COLORS.length)],
    opacity: lit ? (0.3 + progress * 0.7) * (0.65 + noise(cell + 201) * 0.35) : 0,
    delay: `${(noise(cell + 301) * -3).toFixed(2)}s`,
    duration: (1.6 + noise(cell + 401) * 2).toFixed(2),
  };
});

function effortStyle(index: number): CSSProperties {
  const effort = index / LAST;
  return { '--effort': effort, '--level': effort, '--pace': (1.8 - 1.2 * effort).toFixed(2), '--spin': `${Math.round(32 - 24 * effort)}s` } as CSSProperties;
}

function Stardust() {
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 grid grid-flow-col auto-cols-[5px] grid-rows-[repeat(3,5px)] content-center justify-end gap-[1.5px] overflow-hidden pr-1">
      {GALAXY_PIXELS.map((pixel, index) => (
        <span key={index} className="effort-pixel rounded-[1px]" style={{ backgroundColor: pixel.color, '--pixel-opacity': pixel.opacity, '--pixel-duration': pixel.duration, animationDelay: pixel.delay } as CSSProperties} />
      ))}
    </span>
  );
}

function Aura({ galaxy, pulse }: { galaxy: boolean; pulse: number }) {
  return (
    <span aria-hidden className="pointer-events-none absolute top-1/2 left-1/2 -z-10 size-20 -translate-1/2">
      {galaxy ? <span key={pulse} className="effort-bloom absolute inset-0 rounded-full" /> : null}
      <svg viewBox="-40 -40 80 80" className="effort-rays absolute inset-0 size-full overflow-visible">
        {Array.from({ length: 12 }, (_, ray) => (
          <line key={ray} x1="0" y1="-15" x2="0" y2={ray % 2 ? '-30' : '-38'} transform={`rotate(${30 * ray})`} stroke={ray % 3 === 0 ? '#67e8f9' : '#c4b5fd'} strokeWidth="1.6" strokeDasharray="1.6 3" />
        ))}
      </svg>
    </span>
  );
}

/**
 * The reasoning control: a track from the fastest to the smartest. Each stop brings colours, pixels and rays closer to the
 * last one (Galáxia). The thumb is a native range input over eru's drawing, since the Base UI slider isn't available here.
 */
export function EffortPicker({ value, disabled = false, onChange }: { value: number; disabled?: boolean; onChange: (level: number) => void }) {
  const [pulse, setPulse] = useState(0);
  const galaxy = value === LAST;

  return (
    <Popover>
      <PopoverTrigger disabled={disabled} aria-label={`Raciocínio: ${LEVELS[value].label}`} title="Raciocínio desta sessão" style={effortStyle(value)} className={cn(PICKER_TRIGGER, 'effort-scope group shrink-0')}>
        <span aria-hidden className="effort-dot size-2 shrink-0 rounded-full" />
        <span className="effort-tint @max-xl/composer:hidden">{LEVELS[value].label}</span>
      </PopoverTrigger>
      <PopoverPopup side="top" align="start" sideOffset={8} className="w-[min(19rem,calc(100vw-1.5rem))] rounded-xl *:data-[slot=popover-viewport]:overflow-visible *:data-[slot=popover-viewport]:px-3.5 *:data-[slot=popover-viewport]:py-3">
        <div style={effortStyle(value)} className="effort-scope relative isolate">
          <span aria-hidden className="effort-glow pointer-events-none absolute -inset-x-3.5 -inset-y-3 -z-10 rounded-xl" />
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Raciocínio</span>
            <span className="effort-tint font-medium">{LEVELS[value].label}</span>
            <Tooltip>
              <TooltipTrigger
                render={<button type="button" />}
                aria-label="O que é o raciocínio?"
                className="ml-auto inline-flex size-6 cursor-help items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <CircleHelp aria-hidden className="size-3.5" />
              </TooltipTrigger>
              <TooltipPopup className="max-w-60">Quanto o modelo pensa antes de responder. Mais raciocínio deixa a resposta mais cuidadosa, e também mais lenta e mais cara.</TooltipPopup>
            </Tooltip>
          </div>
          <div aria-hidden className="mt-3 flex justify-between text-xs text-muted-foreground">
            <span>Mais rápido</span>
            <span>Mais esperto</span>
          </div>
          <div className="relative mx-3 mt-1.5 flex h-7 items-center">
            <div className="relative h-5 w-full">
              <span aria-hidden className="effort-track absolute inset-y-0 -inset-x-3 rounded-md" />
              <span aria-hidden className="effort-fill absolute inset-y-0 -left-3 overflow-hidden rounded-md transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]" style={{ width: `calc(0.75rem + ${stopPosition(value)})` }}>
                <Stardust />
                {pulse > 0 ? <span key={pulse} className="effort-flash absolute inset-0" /> : null}
              </span>
              {LEVELS.map((level, stop) => (
                <span
                  key={level.value}
                  aria-hidden
                  className={cn('effort-tick pointer-events-none absolute top-1/2 -translate-1/2 rounded-full bg-foreground/35', stop === DEFAULT_LEVEL ? 'h-2.5 w-0.5' : 'size-[3px]')}
                  style={{ left: stopPosition(stop) }}
                />
              ))}
              <span aria-hidden className="absolute top-1/2 isolate flex size-6 -translate-1/2 items-center justify-center rounded-full transition-[left] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]" style={{ left: stopPosition(value) }}>
                <Aura galaxy={galaxy} pulse={pulse} />
                {pulse > 0 ? <span key={pulse} className="effort-ring pointer-events-none absolute inset-0.5 rounded-full" /> : null}
                <span key={`dot-${pulse}`} className={cn('effort-thumb size-5 rounded-full bg-white', pulse > 0 && 'effort-pop')} />
              </span>
              <input
                type="range"
                min={0}
                max={LAST}
                step={1}
                value={value}
                disabled={disabled}
                aria-label="Raciocínio"
                aria-valuetext={LEVELS[value].label}
                onChange={event => {
                  setPulse(count => count + 1);
                  onChange(Number(event.target.value));
                }}
                className="absolute inset-y-0 -inset-x-3 w-[calc(100%+1.5rem)] cursor-pointer opacity-0"
              />
            </div>
          </div>
          <div aria-hidden className="relative mx-3 mt-1 h-4 text-xs text-muted-foreground">
            <span className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `clamp(1rem, ${stopPosition(DEFAULT_LEVEL)}, calc(100% - 1rem))` }}>
              Padrão
            </span>
          </div>
        </div>
      </PopoverPopup>
    </Popover>
  );
}

export type ApprovalMode = 'manual' | 'smart' | 'off';

const MODES: { value: ApprovalMode; label: string; description: string; icon: LucideIcon }[] = [
  { value: 'manual', label: 'Manual', description: 'Pede sua aprovação antes de comandos perigosos.', icon: ShieldCheck },
  { value: 'smart', label: 'Inteligente', description: 'O Hermes avalia o risco e só pede quando precisa.', icon: ShieldHalf },
  { value: 'off', label: 'Desligado', description: 'Executa tudo sem pedir. Use com cuidado.', icon: ShieldOff },
];

/** The profile's approval mode on the field. Desligado stays amber even with the menu closed. */
export function ApprovalModePicker({ mode, disabled = false, onChange }: { mode: ApprovalMode; disabled?: boolean; onChange: (mode: ApprovalMode) => void }) {
  const current = MODES.find(option => option.value === mode)!;
  const off = mode === 'off';

  return (
    <Menu>
      <MenuTrigger
        disabled={disabled}
        aria-label={`Modo de aprovação: ${current.label}`}
        title={`Modo de aprovação do perfil · ${off ? 'Atenção: o agente executa tudo sem pedir aprovação.' : current.description}`}
        className={cn(PICKER_TRIGGER, 'group shrink-0', off && 'bg-warning/12 text-warning-foreground hover:bg-warning/20 data-popup-open:bg-warning/20')}
      >
        <current.icon aria-hidden className={cn('size-3.5 shrink-0', off ? 'text-warning' : 'text-muted-foreground')} />
        <span className="@max-xl/composer:hidden">{current.label}</span>
      </MenuTrigger>
      <MenuPopup side="top" align="start" sideOffset={8} className="w-[min(19rem,calc(100vw-1.5rem))] rounded-xl">
        <MenuGroup>
          <MenuGroupLabel>Modo de aprovação</MenuGroupLabel>
          <MenuRadioGroup value={mode} onValueChange={value => onChange(value as ApprovalMode)}>
            {MODES.map(option => {
              const risky = option.value === 'off';
              return (
                <MenuPrimitive.RadioItem
                  key={option.value}
                  value={option.value}
                  label={option.label}
                  closeOnClick
                  className="group/option flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-2 outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                >
                  <option.icon aria-hidden className={cn('mt-0.5 size-4 shrink-0', risky ? 'text-warning' : 'text-muted-foreground')} />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className={cn('text-sm font-medium', risky && 'text-warning-foreground')}>{option.label}</span>
                    <span className="text-xs leading-snug text-muted-foreground">{option.description}</span>
                  </span>
                  <MenuPrimitive.RadioItemIndicator className="mt-0.5 shrink-0">
                    <Check aria-hidden className="size-4" />
                  </MenuPrimitive.RadioItemIndicator>
                </MenuPrimitive.RadioItem>
              );
            })}
          </MenuRadioGroup>
        </MenuGroup>
        <MenuSeparator />
        <p className="px-2 pt-1 pb-1.5 text-xs text-muted-foreground">
          Vale para todas as sessões do perfil <span className="font-medium text-foreground">{PROFILE.name}</span>.
        </p>
      </MenuPopup>
    </Menu>
  );
}

export interface ContextUsage {
  model: string | null;
  used: number | null;
  max: number | null;
}

const tokenCount = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
const formatTokens = (count: number) => (count >= 1_000_000 ? `${tokenCount.format(count / 1_000_000)}M` : count >= 1000 ? `${tokenCount.format(count / 1000)}k` : tokenCount.format(count));

function wedgePath(share: number) {
  const angle = share * 2 * Math.PI - Math.PI / 2;
  return `M0 0V-5.2A5.2 5.2 0 ${share > 0.5 ? 1 : 0} 1 ${(Math.cos(angle) * 5.2).toFixed(2)} ${(Math.sin(angle) * 5.2).toFixed(2)}Z`;
}

/** How much of the context window the session takes: an 18 px pie on the field's bar; clicking opens the detail. */
export function ContextMeter({ usage }: { usage: ContextUsage }) {
  const { used, max, model } = usage;
  const share = used !== null && max ? Math.min(used / max, 1) : null;
  const high = share !== null && share > 0.85;
  const percent = share === null ? null : `${Math.round(share * 100)}%`;
  const name = `Contexto da sessão: ${percent ?? 'sem medição'}`;
  const label = model ? (CATALOG.flatMap(row => row.models).find(item => item.id === model)?.label ?? model) : null;

  return (
    <Popover>
      <PopoverTrigger
        aria-label={name}
        title={name}
        data-high={high || undefined}
        className={cn(styles.pie, 'relative inline-flex size-8 shrink-0 cursor-pointer touch-manipulation items-center justify-center rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none')}
      >
        <svg aria-hidden viewBox="-9 -9 18 18" className="size-[18px] shrink-0 overflow-visible">
          <circle r={7.5} className={styles.pieRing} strokeDasharray={share === null ? '1.6 2.4' : undefined} />
          {share === null || share <= 0 ? null : <path d={wedgePath(share)} className={styles.pieWedge} />}
        </svg>
      </PopoverTrigger>
      <PopoverPopup side="top" align="end" sideOffset={8} className="w-[min(17rem,calc(100vw-1.5rem))] rounded-xl *:data-[slot=popover-viewport]:px-3.5 *:data-[slot=popover-viewport]:py-3">
        <div className="flex flex-col gap-2.5 text-xs">
          <div className="flex items-baseline justify-between gap-3">
            <PopoverTitle className="text-xs font-medium text-muted-foreground">Contexto da sessão</PopoverTitle>
            {percent ? <span className={cn('font-medium tabular-nums', high ? 'text-warning-foreground' : 'text-foreground')}>{percent}</span> : null}
          </div>
          {used !== null ? (
            <p className="text-sm tabular-nums">
              <span className="font-semibold">{formatTokens(used)}</span>
              <span className="text-muted-foreground">{max ? ` de ${formatTokens(max)} tokens` : ' tokens'}</span>
            </p>
          ) : (
            <p className="text-sm font-medium">Ainda sem medição</p>
          )}
          {share !== null ? (
            <div role="meter" aria-label="Contexto usado" aria-valuemin={0} aria-valuemax={max ?? 0} aria-valuenow={used ?? 0} className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div className={cn('h-full rounded-full', high ? 'bg-warning' : 'bg-primary')} style={{ width: `${share * 100}%` }} />
            </div>
          ) : null}
          <div className="flex flex-col gap-1 text-muted-foreground">
            {used === null && max ? <p>Janela de {formatTokens(max)} tokens</p> : null}
            {label ? (
              <p className="truncate text-foreground" translate="no">
                {label}
              </p>
            ) : null}
            <p className="leading-snug">{used === null ? 'O Hermes mede o contexto na próxima resposta.' : 'Atualiza a cada resposta do agente.'}</p>
          </div>
        </div>
      </PopoverPopup>
    </Popover>
  );
}

export interface ComposerProps {
  active?: boolean;
  disabled?: boolean;
  placeholder?: string;
  usage?: ContextUsage;
  /** The text the field brings when it appears, without sending. */
  initialText?: string;
  autoFocus?: boolean;
  onSend?: (text: string) => void;
  onInterrupt?: () => void;
}

/**
 * The message field: Enter sends, Shift+Enter breaks the line; during the turn, the button interrupts. The field has no border:
 * a slightly transparent dark background blurs what passes behind it, and the text starts on the conversation's axis.
 */
export function Composer({ active = false, disabled = false, placeholder = 'Escreva para o agente…', usage, initialText = '', autoFocus = false, onSend, onInterrupt }: ComposerProps) {
  const [text, setText] = useState(initialText);
  const [choice, setChoice] = useState<ModelChoice>({ provider: 'anthropic', model: 'claude-opus-5-5' });
  const [effort, setEffort] = useState(DEFAULT_LEVEL);
  const [mode, setMode] = useState<ApprovalMode>('off');
  const [attachments, setAttachments] = useState<string[]>([]);
  const field = useRef<HTMLTextAreaElement>(null);
  const canSend = !disabled && !active && text.trim().length > 0;
  const reasons = findModel(choice)?.reasoning ?? true;

  useEffect(() => {
    if (autoFocus) field.current?.focus();
  }, [autoFocus]);

  const send = (event?: FormEvent) => {
    event?.preventDefault();
    if (!canSend) return;
    onSend?.(text.trim());
    setText('');
    setAttachments([]);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      send();
    }
  };

  return (
    <form onSubmit={send} className={cn(styles.form, 'group/composer @container/composer relative isolate')}>
      <div className={cn(styles.field, 'flex flex-col rounded-2xl')}>
        <Textarea
          ref={field}
          aria-label="Mensagem"
          value={text}
          onChange={event => setText(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          unstyled
          className={cn(styles.text, 'min-w-0 [&_textarea]:max-h-60 [&_textarea]:resize-none [&_textarea]:text-base [&_textarea]:leading-relaxed sm:[&_textarea]:text-sm')}
        />
        {attachments.length > 0 ? (
          <ul aria-label="Anexos da mensagem" className={cn(styles.inset, 'flex flex-wrap gap-1.5 pr-4 pb-2')}>
            {attachments.map(name => (
              <li key={name} className="flex h-7 items-center gap-1.5 rounded-full border border-h2 pr-1 pl-2.5 text-xs text-muted-foreground">
                <Paperclip aria-hidden className="size-3" />
                <span className="max-w-40 truncate">{name}</span>
                <button type="button" aria-label={`Tirar ${name}`} onClick={() => setAttachments(current => current.filter(item => item !== name))} className="flex size-5 cursor-pointer items-center justify-center rounded-full hover:bg-muted hover:text-foreground">
                  ×
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <div className={cn(styles.bar, 'flex min-w-0 items-center gap-1.5 pt-0.5 pr-2 pb-2')}>
          <div className="flex min-w-0 flex-1 items-center gap-0.5">
            <ModelPicker value={choice} disabled={disabled} onChange={setChoice} />
            {reasons ? <NotchDivider /> : null}
            {reasons ? <EffortPicker value={effort} disabled={disabled} onChange={setEffort} /> : null}
            <NotchDivider />
            <ApprovalModePicker mode={mode} disabled={disabled} onChange={setMode} />
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-1">
            {usage ? <ContextMeter usage={usage} /> : null}
            <label
              className="relative flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground has-focus-visible:ring-2 has-focus-visible:ring-ring/50 has-disabled:pointer-events-none has-disabled:opacity-50"
              title="Anexar do computador"
            >
              <Paperclip className="size-4" aria-hidden />
              <input
                type="file"
                multiple
                aria-label="Anexar do computador"
                className="sr-only"
                disabled={disabled}
                onChange={event => {
                  const names = [...(event.target.files ?? [])].map(item => item.name);
                  event.target.value = '';
                  setAttachments(current => [...current, ...names.filter(name => !current.includes(name))]);
                }}
              />
            </label>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label="Anexar do servidor"
              title="Anexar do servidor"
              disabled={disabled}
              onClick={() => setAttachments(current => (current.includes('AppShell.tsx') ? current : [...current, 'AppShell.tsx']))}
              className="rounded-md text-muted-foreground"
            >
              <FolderOpen />
            </Button>
          </div>
          {active && onInterrupt ? (
            <button type="button" aria-label="Interromper" onClick={onInterrupt} className={cn(styles.send, styles.stop)}>
              <Square aria-hidden className="fill-current" />
            </button>
          ) : (
            <button type="submit" aria-label="Enviar" disabled={!canSend} className={cn(styles.send, canSend && styles.ready)}>
              <ArrowUp aria-hidden />
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
