/** @studio-id p3rawj0r2bhfkagj */
// The recent sessions panel open beside the column, and what happens inside it: hovering a project or a session,
// collapsing a project and asking for more of its sessions.
import { panelProjects, sessionsOfNode } from '../_components/data/sessions';
import { Board, Case, SideMenu } from './_menu/SideMenu';
import type { ProjectsPanelProps } from './_menu/ProjectsPanel';

const projects = panelProjects();
const first = projects[0];
const second = projects[1];
const withProject = projects.find(node => node.project) ?? first;
const firstSession = sessionsOfNode(first)[0];

const CASES: { label: string; note: string; panel: ProjectsPanelProps }[] = [
  { label: 'Aberto', note: 'Sessões abre o painel e fica dourado enquanto ele está aberto.', panel: {} },
  { label: 'Mouse num projeto', note: 'Aparecem a seta para recolher, Nova sessão e Editar.', panel: { preview: { project: withProject.id } } },
  { label: 'Mouse numa sessão', note: 'A linha ganha um fundo leve. O clique abre a sessão.', panel: { preview: { session: firstSession?.id } } },
  { label: 'Sessão aberta', note: 'A sessão em que você está fica marcada.', panel: { current: firstSession?.id } },
  { label: 'Projeto recolhido', note: 'A seta recolhe as sessões do projeto; só o nome fica.', panel: { closed: [first.id] } },
  { label: 'Mais sessões', note: '"Mais N" traz dez de cada vez; "Mostrar menos" volta a quatro.', panel: { closed: second ? [second.id] : [], expanded: [first.id] } },
];

export default function PainelDeSessoes() {
  return (
    <Board title="Painel de sessões" description="As sessões recentes por projeto, ao lado da coluna. Cada projeto mostra quatro sessões; a busca fica no alto e a lista completa no pé.">
      {CASES.map(item => (
        <Case key={item.label} label={item.label} note={item.note} height={680}>
          <SideMenu current="inicio" projectsOpen preview={{}} panel={item.panel} />
        </Case>
      ))}
    </Board>
  );
}
