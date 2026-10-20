/** @studio-id 97effnpcddgq1t4p */
// The panel's search and the moments it waits, fails or has nothing to show.
import { Board, Case, SideMenu } from './_menu/SideMenu';
import type { ProjectsPanelProps } from './_menu/ProjectsPanel';

const CASES: { label: string; note: string; panel: ProjectsPanelProps }[] = [
  { label: 'Buscando', note: 'A busca abre todos os projetos e mostra só as sessões que batem.', panel: { search: 'canvas', preview: { search: true } } },
  { label: 'Busca sem resultado', note: 'Nada bate com o texto.', panel: { search: 'orçamento da festa', preview: { search: true } } },
  { label: 'Carregando', note: 'Enquanto o Hermes responde.', panel: { state: 'loading' } },
  { label: 'Erro', note: 'O Hermes não respondeu. Dá para tentar de novo.', panel: { state: 'error' } },
  { label: 'Vazio', note: 'Um perfil sem nenhuma sessão.', panel: { state: 'empty' } },
];

export default function BuscaEEstados() {
  return (
    <Board title="Painel de sessões: busca e estados" description="A busca do painel e os momentos em que ele espera, falha ou não tem nada para mostrar.">
      {CASES.map(item => (
        <Case key={item.label} label={item.label} note={item.note} height={680}>
          <SideMenu current="inicio" projectsOpen preview={{}} panel={item.panel} />
        </Case>
      ))}
    </Board>
  );
}
