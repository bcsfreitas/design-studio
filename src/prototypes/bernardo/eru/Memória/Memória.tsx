/** @studio-id fr8r8vyvb9e3f60v */
// Memória, from eru features/memory/MemoryPage: the memory provider and the two files the agent keeps, the agent's notes
// and what it knows about the user, one card each.
import { useId } from 'react';
import { ErrorState } from '@/systems/eru/components/error-state';
import { LoadingState } from '@/systems/eru/components/loading-state';
import { Markdown } from '@/systems/eru/components/markdown';
import { Badge } from '@/systems/eru/components/badge';
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from '@/systems/eru/components/card';
import AppShell, { PAGE_COLUMN, PageBar } from '../_components/shell/AppShell';
import { AGENT_MEMORY, MEMORY_PROVIDER, USER_MEMORY } from '../_components/data/memory';

export type MemoryState = 'ready' | 'loading' | 'error' | 'empty';

function ProviderCard({ state }: { state: MemoryState }) {
  const titleId = useId();
  const provider = MEMORY_PROVIDER;

  return (
    <Card role="region" aria-labelledby={titleId}>
      <CardHeader>
        <CardTitle>
          <h2 id={titleId}>Provedor de memória</h2>
        </CardTitle>
        <CardDescription>De onde vem o contexto extra que o agente recebe, além das anotações abaixo.</CardDescription>
      </CardHeader>
      <CardPanel>
        {state === 'error' ? (
          <ErrorState title="Não foi possível ler o provedor de memória." description="O dashboard respondeu 502: Bad Gateway." onRetry={() => undefined} />
        ) : state === 'loading' ? (
          <LoadingState label="Carregando o provedor de memória" lines={1} />
        ) : state === 'empty' ? (
          <p className="text-sm text-muted-foreground">Nenhum provedor externo ativo. O agente usa só a memória embutida do Hermes.</p>
        ) : (
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{provider.name}</span>
              {provider.configured ? <Badge>Configurado</Badge> : <Badge variant="destructive">Não configurado</Badge>}
            </div>
            <p className="text-sm text-muted-foreground">{provider.description}</p>
            <p className="text-sm text-muted-foreground">{provider.status}</p>
          </div>
        )}
      </CardPanel>
    </Card>
  );
}

const SECTIONS = [
  { file: 'memory', entries: AGENT_MEMORY, title: 'Memória do agente', description: 'O que o agente anotou sobre o ambiente, os projetos e o trabalho.', empty: 'O agente ainda não anotou nada neste perfil.', failure: 'Não foi possível ler a memória do agente.' },
  { file: 'user', entries: USER_MEMORY, title: 'Perfil do usuário', description: 'O que o agente sabe sobre você.', empty: 'O agente ainda não anotou nada sobre você neste perfil.', failure: 'Não foi possível ler o perfil do usuário.' },
];

function MemorySection({ section, state }: { section: (typeof SECTIONS)[number]; state: MemoryState }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{section.title}</h2>
        </CardTitle>
        <CardDescription>{section.description}</CardDescription>
      </CardHeader>
      <CardPanel>
        {state === 'error' ? (
          <ErrorState title={section.failure} description="O dashboard respondeu 502: Bad Gateway." onRetry={() => undefined} />
        ) : state === 'loading' ? (
          <LoadingState label={`Carregando ${section.title.toLowerCase()}`} />
        ) : state === 'empty' ? (
          <p className="text-sm text-muted-foreground">{section.empty}</p>
        ) : (
          <ul aria-label={section.title} className="flex flex-col divide-y">
            {section.entries.map((entry, index) => (
              <li key={index} className="py-2 first:pt-0 last:pb-0">
                <Markdown variant="compact">{entry}</Markdown>
              </li>
            ))}
          </ul>
        )}
      </CardPanel>
    </Card>
  );
}

export function MemoryScreen({ state = 'ready' }: { state?: MemoryState }) {
  return (
    <AppShell current="memoria" bar={<PageBar area="memoria" />}>
      <section className={PAGE_COLUMN}>
        <div className="flex flex-col gap-4">
          <ProviderCard state={state} />
          {SECTIONS.map(section => (
            <MemorySection key={section.file} section={section} state={state} />
          ))}
        </div>
      </section>
    </AppShell>
  );
}

export default function Memoria() {
  return <MemoryScreen />;
}
