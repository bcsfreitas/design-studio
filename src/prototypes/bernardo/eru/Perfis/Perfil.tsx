/** @studio-id as99ze7wewgce9yz */
// Perfil: one profile's page, from eru features/profiles/ProfileDetailPage and ModelPicker: its role, the model it runs
// with (changeable here) and its SOUL.
import { useState } from 'react';
import { cn } from '#studio/runtime';
import { Badge } from '@/systems/eru/components/badge';
import { ErrorState } from '@/systems/eru/components/error-state';
import { Markdown } from '@/systems/eru/components/markdown';
import { Select, SelectGroup, SelectGroupLabel, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '@/systems/eru/components/select';
import { Skeleton } from '@/systems/eru/components/skeleton';
import { UserCheck } from '@/systems/eru/libraries/icons';
import AppShell, { PAGE_COLUMN, PageBar } from '../_components/shell/AppShell';
import { PageBarAction } from '../_components/shell/PageBarAction';
import { MODEL_PROVIDERS, PROFILES, SOUL } from '../_components/data/profiles';

const BACK = { label: 'Voltar para os perfis', to: 'Perfis/Perfis' };
const SEPARATOR = '::';

export type ProfileState = 'ready' | 'loading' | 'error';

function ModelPicker({ provider, model, loading }: { provider: string; model: string; loading: boolean }) {
  const [current, setCurrent] = useState(loading ? null : `${provider}${SEPARATOR}${model}`);
  const [changed, setChanged] = useState<string | null>(null);
  const items = Object.fromEntries(MODEL_PROVIDERS.flatMap(entry => entry.models.map(name => [`${entry.slug}${SEPARATOR}${name}`, name])));
  const currentProvider = current ? MODEL_PROVIDERS.find(entry => entry.slug === current.split(SEPARATOR)[0])?.name : null;

  return (
    <div className="flex flex-col gap-2">
      <Select
        items={items}
        value={current}
        onValueChange={value => {
          if (!value) return;
          setCurrent(value);
          setChanged(items[value] ?? null);
        }}
        disabled={loading}
      >
        <SelectTrigger aria-label="Modelo do perfil" className="w-full sm:max-w-sm">
          <SelectValue placeholder={loading ? 'Carregando opções…' : 'Escolha um modelo'} />
        </SelectTrigger>
        <SelectPopup>
          {MODEL_PROVIDERS.map(entry => (
            <SelectGroup key={entry.slug}>
              <SelectGroupLabel>{entry.name}</SelectGroupLabel>
              {entry.models.map(name => (
                <SelectItem key={name} value={`${entry.slug}${SEPARATOR}${name}`}>
                  {name}
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectPopup>
      </Select>
      {currentProvider ? <p className="text-xs text-muted-foreground">Provedor: {currentProvider}</p> : null}
      {changed ? (
        <p role="status" className="text-sm">
          Modelo trocado para {changed}.
        </p>
      ) : null}
    </div>
  );
}

function Soul({ state }: { state: ProfileState }) {
  if (state === 'loading') {
    return (
      <div className="flex flex-col gap-2" aria-label="Carregando o SOUL">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    );
  }

  if (state === 'error') {
    return <ErrorState title="Não foi possível carregar o SOUL." description="O dashboard não atendeu o pedido." onRetry={() => undefined} />;
  }

  return <Markdown>{SOUL}</Markdown>;
}

export function ProfileScreen({ name = 'default', state = 'ready' }: { name?: string; state?: ProfileState }) {
  const profile = PROFILES.find(candidate => candidate.name === name) ?? PROFILES[0];
  const [active, setActive] = useState('default');

  return (
    <AppShell
      current="perfis"
      bar={
        <PageBar
          title={profile.name}
          marks={
            <>
              {profile.name === active ? <Badge>Em uso</Badge> : null}
              {profile.is_default ? <Badge variant="secondary">Padrão</Badge> : null}
            </>
          }
          context="Perfis"
          back={BACK}
          action={profile.name === active ? null : <PageBarAction icon={UserCheck} label="Usar este perfil" onClick={() => setActive(profile.name)} />}
        />
      }
    >
      <section className={cn(PAGE_COLUMN, 'gap-6')}>
        <p className="text-muted-foreground">{profile.description || 'Sem descrição.'}</p>

        <section aria-labelledby="perfil-modelo" className="flex flex-col gap-3 rounded-lg border p-4">
          <h2 id="perfil-modelo" className="font-heading text-lg font-semibold">
            Modelo
          </h2>
          <ModelPicker provider={profile.provider} model={profile.model} loading={state === 'loading'} />
        </section>

        <section aria-labelledby="perfil-soul" className="flex flex-col gap-3 rounded-lg border p-4">
          <h2 id="perfil-soul" className="font-heading text-lg font-semibold">
            SOUL
          </h2>
          <Soul state={state} />
        </section>
      </section>
    </AppShell>
  );
}

export default function Perfil() {
  return <ProfileScreen />;
}
