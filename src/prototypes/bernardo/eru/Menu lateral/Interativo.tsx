/** @studio-id 04c0q963cebxq6fm */
// The side menu over a whole screen, to try its interactions by hand: hover and focus show the tooltips, Sessões opens
// and closes the recent sessions panel, and the other areas mark themselves without leaving this page.
import { useState } from 'react';
import { Sky } from '../_components/sky/Sky';
import { SideMenu } from './_menu/SideMenu';
import { areaById, type MenuPlace } from './_menu/areas';

export default function Interativo() {
  const [current, setCurrent] = useState<MenuPlace>('inicio');
  const [projectsOpen, setProjectsOpen] = useState(false);
  const area = current === 'nova-sessao' ? { title: 'Nova sessão', description: 'Comece uma conversa com o agente.' } : areaById(current);

  return (
    <div className="flex h-screen min-h-0 w-full overflow-hidden bg-sidebar text-foreground">
      <SideMenu current={current} projectsOpen={projectsOpen} onToggleProjects={() => setProjectsOpen(open => !open)} onSelect={setCurrent} />
      <main className="sky-card relative isolate my-2 mr-2 flex h-[calc(100vh-1rem)] min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-h2 bg-background">
        <Sky scene="calmo" />
        <header className="relative z-[1] flex h-14 shrink-0 items-center gap-2 border-b border-h1 px-6">
          <h1 className="font-heading text-[15px] leading-5 font-semibold tracking-tight">{area.title}</h1>
          <div className="min-w-4 flex-1" />
          <p className="truncate text-xs text-muted-foreground">{area.description}</p>
        </header>
        <div className="relative z-[1] flex flex-1 items-center justify-center p-6">
          <p className="max-w-80 text-center text-sm text-muted-foreground">Aqui entra a tela de {area.title}. Os cliques no menu ficam nesta página.</p>
        </div>
      </main>
    </div>
  );
}
