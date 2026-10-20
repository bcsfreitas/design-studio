/** @studio-id y4z59h0441gnaygz */
// The mark of the current page in each place of the column: the diamond and the line on the left, the brighter icon.
import { Board, Case, SideMenu } from './_menu/SideMenu';
import type { MenuPlace } from './_menu/areas';

const CASES: { label: string; note?: string; current?: MenuPlace }[] = [
  { label: 'Nova sessão', current: 'nova-sessao' },
  { label: 'Início', current: 'inicio' },
  { label: 'Sessões', note: 'Na página Sessões, com o painel fechado.', current: 'sessoes' },
  { label: 'Agendamentos', current: 'agendamentos' },
  { label: 'Memória', current: 'memoria' },
  { label: 'Arquivos', current: 'arquivos' },
  { label: 'Perfis', current: 'perfis' },
  { label: 'Nenhum', note: 'A página de um projeto não é uma área.' },
];

export default function ItemAtual() {
  return (
    <Board title="Item atual" description="Onde você está: o losango e o traço à esquerda do ícone, que fica mais claro. O Terminal ainda não abre, então nunca é o atual.">
      {CASES.map(item => (
        <Case key={item.label} label={item.label} note={item.note} zoom={1.5}>
          <SideMenu current={item.current} preview={{}} />
        </Case>
      ))}
    </Board>
  );
}
