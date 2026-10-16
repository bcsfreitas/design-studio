/** @studio-id 42cne0v04z7m5j1v */
// Perfis, from eru features/profiles/ProfilesPage and CreateProfileDialog: the Hermes profiles with the one in use, their
// model and role, "Usar este perfil" on the others and "Criar perfil" in the bar. Choosing and creating work locally.
import { useId, useState, type FormEvent } from 'react';
import { Link } from '@module/prototypes';
import { cn } from '#studio/runtime';
import { Badge } from '@/systems/eru/components/badge';
import { Button } from '@/systems/eru/components/button';
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogPanel, DialogPopup, DialogTitle, DialogTrigger } from '@/systems/eru/components/dialog';
import { ErrorState } from '@/systems/eru/components/error-state';
import { ListGroup, ListRow } from '@/systems/eru/components/grouped-list';
import { Input } from '@/systems/eru/components/input';
import { Label } from '@/systems/eru/components/label';
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '@/systems/eru/components/select';
import { Textarea } from '@/systems/eru/components/textarea';
import { Plus } from '@/systems/eru/libraries/icons';
import AppShell, { PAGE_COLUMN, PageBar } from '../_components/shell/AppShell';
import { PageBarAction } from '../_components/shell/PageBarAction';
import { PROFILES, PROFILE_NAME_PATTERN, PROFILE_NAME_RULE, modelLine, type Profile } from '../_components/data/profiles';

const BLANK = 'em-branco';

function CreateProfileDialog({ profiles, onCreated }: { profiles: Profile[]; onCreated: (profile: Profile) => void }) {
  const ids = { name: useId(), description: useId(), source: useId(), rule: useId() };
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [source, setSource] = useState(BLANK);
  const [invalidName, setInvalidName] = useState(false);
  const [pending, setPending] = useState(false);
  const sources = [{ value: BLANK, label: 'Nenhum (perfil em branco)' }, ...profiles.map(profile => ({ value: profile.name, label: profile.name }))];

  const changeOpen = (next: boolean) => {
    if (!next && pending) return;
    setOpen(next);
    if (next) {
      setName('');
      setDescription('');
      setSource(BLANK);
      setInvalidName(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!PROFILE_NAME_PATTERN.test(trimmed)) {
      setInvalidName(true);
      return;
    }
    setInvalidName(false);
    setPending(true);
    const copied = profiles.find(profile => profile.name === source);
    window.setTimeout(() => {
      setPending(false);
      setOpen(false);
      onCreated({ name: trimmed, description: description.trim(), provider: copied?.provider ?? 'anthropic', model: copied?.model ?? 'claude-opus-5-5', is_default: false });
    }, 700);
  };

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger render={<PageBarAction icon={Plus} label="Criar perfil" />} />
      <DialogPopup>
        <DialogHeader>
          <DialogTitle>Criar perfil</DialogTitle>
          <DialogDescription>Um perfil novo do Hermes, com configuração, memória, skills e sessões próprias.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="contents">
          <DialogPanel className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor={ids.name}>Nome</Label>
              <Input id={ids.name} value={name} onChange={event => setName(event.target.value)} autoComplete="off" autoCapitalize="none" spellCheck={false} aria-invalid={invalidName || undefined} aria-describedby={ids.rule} />
              <p id={ids.rule} className="text-xs text-muted-foreground">
                {PROFILE_NAME_RULE}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={ids.description}>Descrição</Label>
              <Textarea id={ids.description} value={description} onChange={event => setDescription(event.target.value)} placeholder="Opcional. O papel deste perfil." rows={3} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={ids.source}>Copiar de</Label>
              <Select items={sources} value={source} onValueChange={next => setSource(next ?? BLANK)}>
                <SelectTrigger id={ids.source} aria-label="Copiar de" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectPopup>
                  {sources.map(item => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
              <p className="text-xs text-muted-foreground">Copia a configuração, o SOUL e as skills do perfil escolhido.</p>
            </div>
            {invalidName ? <ErrorState title="Nome de perfil inválido." description={PROFILE_NAME_RULE} /> : null}
          </DialogPanel>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? 'Criando…' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogPopup>
    </Dialog>
  );
}

export function ProfilesScreen() {
  const [profiles, setProfiles] = useState(PROFILES);
  const [active, setActive] = useState('default');
  const [created, setCreated] = useState<string | null>(null);

  const add = (profile: Profile) => {
    setProfiles(current => [...current, profile].sort((a, b) => Number(b.is_default) - Number(a.is_default) || a.name.localeCompare(b.name)));
    setCreated(profile.name);
  };

  return (
    <AppShell current="perfis" bar={<PageBar area="perfis" action={<CreateProfileDialog profiles={profiles} onCreated={add} />} />}>
      <section className={cn(PAGE_COLUMN, 'gap-2')}>
        {created ? (
          <p role="status" className="text-sm">
            Perfil {created} criado.
          </p>
        ) : null}
        <ListGroup label="Perfis do Hermes">
          {profiles.map(profile => {
            const inUse = profile.name === active;
            return (
              <ListRow
                key={profile.name}
                label={profile.name}
                render={<Link to="Perfis/Perfil" />}
                action={
                  inUse ? null : (
                    <Button variant="outline" size="sm" aria-label="Usar este perfil" className="min-h-11 sm:min-h-7" onClick={() => setActive(profile.name)}>
                      <span>
                        Usar<span className="max-sm:hidden"> este perfil</span>
                      </span>
                    </Button>
                  )
                }
              >
                <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="min-w-0 font-medium break-all">{profile.name}</span>
                  {inUse ? <Badge>Em uso</Badge> : null}
                  {profile.is_default ? <Badge variant="secondary">Padrão</Badge> : null}
                </span>
                <span className="text-xs text-muted-foreground">{modelLine(profile)}</span>
                <span className="line-clamp-2 text-sm text-muted-foreground">{profile.description || 'Sem descrição.'}</span>
              </ListRow>
            );
          })}
        </ListGroup>
      </section>
    </AppShell>
  );
}

export default function Perfis() {
  return <ProfilesScreen />;
}
