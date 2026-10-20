// Ajustes e conta, from eru features/account/AccountSettings: the profile with the switch, the usage of each provider,
// the daylight, the sky's motion, the connection and Sair. The choices only change this card: the light and the sky of the
// prototype follow the studio's mode button.
import { useId, useState, type ReactNode } from 'react';
import { cn } from '#studio/runtime';
import { RadioGroupPrimitive, RadioPrimitive } from '@/systems/eru/components/radio-group';
import { Select, SelectItem, SelectPopup, SelectPrimitive, SelectValue } from '@/systems/eru/components/select';
import { ChevronRight, LogOut } from '@/systems/eru/libraries/icons';
import { PROFILES } from '../../_components/data/profiles';
import { UsageRows, type UsageCard } from './usage';

export type Daylight = 'auto' | 'manha' | 'tarde' | 'noite';
export type Connection = 'open' | 'reconnecting' | 'unavailable';
export type Plugin = 'ok' | 'missing' | 'failing';

export const CONNECTION: Record<Connection, { label: string; dot: string; healthy: boolean }> = {
  open: { label: 'Conectado', dot: 'bg-success', healthy: true },
  reconnecting: { label: 'Reconectando…', dot: 'bg-warning', healthy: false },
  unavailable: { label: 'Dashboard fora do ar', dot: 'bg-destructive', healthy: false },
};

export const PLUGIN: Record<Plugin, { label: string; dot: string; healthy: boolean }> = {
  ok: { label: 'Plugin do eru respondendo', dot: 'bg-success', healthy: true },
  missing: { label: 'Plugin do eru não instalado', dot: 'bg-warning', healthy: false },
  failing: { label: 'Plugin do eru sem resposta', dot: 'bg-destructive', healthy: false },
};

const MODES: { id: Daylight; label: string; description: string }[] = [
  { id: 'auto', label: 'Automático', description: 'Segue o relógio: claro de manhã e à tarde, escuro à noite, mudando devagar.' },
  { id: 'manha', label: 'Manhã', description: 'Fica na luz da manhã até você voltar para o automático.' },
  { id: 'tarde', label: 'Tarde', description: 'Fica na luz da tarde até você voltar para o automático.' },
  { id: 'noite', label: 'Noite', description: 'Fica na luz da noite até você voltar para o automático.' },
];

/** "Now" in the prototype is 15:40, in the afternoon. */
const HOUR = 15 + 40 / 60;

const ROW = 'flex min-h-11 w-full min-w-0 items-center gap-3 px-3 py-2.5 text-left';
const BUTTON_ROW = cn(
  ROW,
  'cursor-pointer transition-colors duration-150 hover:bg-foreground/4 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset disabled:cursor-default disabled:opacity-60 motion-reduce:transition-none',
);

function Glyph({ children, className }: { children: ReactNode; className?: string }) {
  return <span aria-hidden className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg bg-foreground/6 text-muted-foreground [&_svg]:size-4', className)}>{children}</span>;
}

function Text({ title, detail, titleClassName }: { title: string; detail?: ReactNode; titleClassName?: string }) {
  return (
    <span className="flex min-w-0 flex-1 flex-col">
      <span className={cn('truncate text-sm font-medium', titleClassName)}>{title}</span>
      {detail ? <span className="truncate text-xs text-muted-foreground">{detail}</span> : null}
    </span>
  );
}

function ProfileRow({ profile, onProfile, switching }: { profile: string; onProfile: (name: string) => void; switching: boolean }) {
  const items = PROFILES.map(item => ({ value: item.name, label: item.name }));
  const current = PROFILES.find(item => item.name === profile) ?? PROFILES[0];
  const model = [current.provider, current.model].filter(Boolean).join(' · ');
  return (
    <Select items={items} value={profile} onValueChange={next => next && onProfile(next)} open={switching ? true : undefined}>
      <SelectPrimitive.Trigger
        aria-label={`Perfil ${profile}, trocar de perfil`}
        className="flex min-h-11 w-full min-w-0 cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left ring-1 ring-h2 transition-colors duration-150 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none data-popup-open:bg-muted motion-reduce:transition-none"
      >
        <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-foreground/8 font-heading text-sm font-semibold uppercase">
          {profile.charAt(0)}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-medium">Perfil {profile}</span>
          {model ? <span className="truncate text-xs text-muted-foreground">{model}</span> : null}
        </span>
        <span className="flex shrink-0 items-center gap-0.5 text-xs text-muted-foreground">
          Trocar
          <ChevronRight aria-hidden className="size-3.5" />
        </span>
        <SelectValue className="sr-only" />
      </SelectPrimitive.Trigger>
      <SelectPopup side="bottom" sideOffset={8} alignItemWithTrigger={false}>
        {items.map(item => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectPopup>
    </Select>
  );
}

function DaylightDial({ hour }: { hour: number }) {
  const angle = (h: number) => ((h - 12) / 24) * 2 * Math.PI - Math.PI / 2;
  const point = (h: number) => [Math.cos(angle(h)) * 6, Math.sin(angle(h)) * 6].map(value => Math.round(value * 100) / 100);
  const [x1, y1] = point(6);
  const [x2, y2] = point(18);
  const [nx, ny] = point(hour);
  return (
    <svg viewBox="-8 -8 16 16" aria-hidden className="size-4 shrink-0 overflow-visible">
      <circle r="6" fill="none" stroke="var(--h4)" strokeWidth="1" />
      <path d={`M${x1} ${y1}A6 6 0 0 1 ${x2} ${y2}`} fill="none" stroke="rgb(var(--tint))" strokeWidth="1.6" />
      <circle cx={nx} cy={ny} r="1.7" fill="rgb(var(--tint))" />
    </svg>
  );
}

const FIXED_HOUR: Record<Daylight, number> = { auto: HOUR, manha: 9, tarde: 15, noite: 21 };

function DaylightRow({ mode, onMode }: { mode: Daylight; onMode: (mode: Daylight) => void }) {
  const labelId = useId();
  const hour = FIXED_HOUR[mode];
  const time = `${String(Math.floor(hour)).padStart(2, '0')}:${String(Math.round((hour % 1) * 60)).padStart(2, '0')}`;
  const now = mode === 'auto' ? `Tarde · ${time}` : `Fixa · ${time}`;
  return (
    <li className="px-3 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <span id={labelId} className="font-mono text-[10px] leading-[1.7] font-medium tracking-[0.16em] text-dim uppercase">
          Luz do dia
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
          <DaylightDial hour={hour} />
          {now}
        </span>
      </div>
      <RadioGroupPrimitive
        aria-labelledby={labelId}
        value={mode}
        onValueChange={value => onMode(value as Daylight)}
        className="mt-1.5 grid grid-cols-4 gap-0.5 rounded-lg border border-h2 p-0.5"
      >
        {MODES.map(option => (
          <RadioPrimitive.Root
            key={option.id}
            value={option.id}
            className="flex h-7 cursor-pointer items-center justify-center rounded-md text-[12.5px] text-muted-foreground transition-colors duration-120 ease-(--ease) outline-none select-none hover:text-ink focus-visible:ring-2 focus-visible:ring-ring data-checked:bg-h2 data-checked:text-ink motion-reduce:transition-none"
          >
            {option.label}
          </RadioPrimitive.Root>
        ))}
      </RadioGroupPrimitive>
      <p className="pt-1.5 text-xs leading-[1.45] text-muted-foreground">{MODES.find(option => option.id === mode)?.description}</p>
    </li>
  );
}

function SkyMotionRow({ moving, onMoving }: { moving: boolean; onMoving: (moving: boolean) => void }) {
  const titleId = useId();
  const detailId = useId();
  return (
    <li>
      <button
        type="button"
        role="switch"
        aria-checked={moving}
        aria-labelledby={titleId}
        aria-describedby={detailId}
        onClick={() => onMoving(!moving)}
        className="group flex min-h-11 w-full min-w-0 cursor-pointer items-center gap-3 px-3 py-2.5 text-left transition-colors duration-150 hover:bg-foreground/4 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset motion-reduce:transition-none"
      >
        <span className="flex min-w-0 flex-1 flex-col">
          <span id={titleId} className="truncate text-sm font-medium">
            Movimento do fundo
          </span>
          <span id={detailId} className="text-xs leading-[1.45] text-muted-foreground">
            {moving ? 'O selo do projeto gira devagar.' : 'Pausado. O céu fica parado.'}
          </span>
        </span>
        <span aria-hidden className={cn('relative h-4.5 w-7.5 shrink-0 rounded-full transition-colors duration-150 ease-(--ease) motion-reduce:transition-none', moving ? 'bg-tint/35' : 'bg-h2')}>
          <span className={cn('absolute top-0.5 left-0.5 size-3.5 rounded-full transition-transform duration-150 ease-(--ease) motion-reduce:transition-none', moving ? 'translate-x-3 bg-tint' : 'bg-muted-foreground')} />
        </span>
      </button>
    </li>
  );
}

function ConnectionRow({ connection, plugin }: { connection: Connection; plugin: Plugin }) {
  const link = CONNECTION[connection];
  const eru = PLUGIN[plugin];
  return (
    <li className={ROW}>
      <Glyph>
        <span className={cn('size-2 rounded-full', link.dot)} />
      </Glyph>
      <Text title={link.label} detail={<span title={eru.healthy ? 'Plugin do eru 0.9.2' : undefined}>{eru.label}</span>} />
      {eru.healthy ? null : <span aria-hidden className={cn('size-2 shrink-0 rounded-full', eru.dot)} />}
    </li>
  );
}

function SignOutRow({ failed: initialFailed }: { failed: boolean }) {
  const [leaving, setLeaving] = useState(false);
  const failed = initialFailed && !leaving;
  return (
    <li>
      <button type="button" onClick={() => setLeaving(true)} disabled={leaving} className={BUTTON_ROW}>
        <Glyph className="bg-destructive/12 text-destructive-foreground">
          <LogOut />
        </Glyph>
        <Text title={leaving ? 'Saindo…' : 'Sair'} detail="bernardo" titleClassName="text-destructive-foreground" />
      </button>
      {failed ? (
        <p role="alert" className="px-3 pb-2.5 pl-14 text-xs text-destructive-foreground">
          Não foi possível sair. Tente de novo.
        </p>
      ) : null}
    </li>
  );
}

export interface AccountState {
  usage?: UsageCard[];
  /** The first provider's row starts open, with its windows. */
  usageOpen?: boolean;
  daylight?: Daylight;
  moving?: boolean;
  connection?: Connection;
  plugin?: Plugin;
  /** The profile list starts open. */
  switching?: boolean;
  signOutFailed?: boolean;
}

export function AccountSettings({ usage = [], usageOpen = false, daylight = 'auto', moving: initialMoving = true, connection = 'open', plugin = 'ok', switching = false, signOutFailed = false }: AccountState) {
  const [profile, setProfile] = useState('default');
  const [mode, setMode] = useState(daylight);
  const [moving, setMoving] = useState(initialMoving);
  return (
    <div className="flex flex-col gap-2.5">
      <ProfileRow profile={profile} onProfile={setProfile} switching={switching} />
      <ul aria-label="Uso, luz e conta" className="flex flex-col divide-y overflow-hidden border-y">
        <UsageRows cards={usage} openFirst={usageOpen} />
        <DaylightRow mode={mode} onMode={setMode} />
        <SkyMotionRow moving={moving} onMoving={setMoving} />
        <ConnectionRow connection={connection} plugin={plugin} />
        <SignOutRow failed={signOutFailed} />
      </ul>
    </div>
  );
}
