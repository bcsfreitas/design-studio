/** @studio-id axn93w1qbtjbfk32 */
// Hover and keyboard focus on each kind of item of the column, with the tooltip each one shows.
import { Board, Case, SideMenu } from './_menu/SideMenu';
import type { MenuPreview } from './_menu/IconColumn';

const CASES: { label: string; note: string; preview: MenuPreview }[] = [
  { label: 'Parado', note: 'Ninguém em cima de nada.', preview: {} },
  { label: 'Mouse numa área', note: 'O fundo acende e o nome aparece ao lado.', preview: { hover: 'agendamentos', tip: 'agendamentos' } },
  { label: 'Mouse em Nova sessão', note: 'O círculo ganha um fundo dourado leve.', preview: { hover: 'nova-sessao', tip: 'nova-sessao' } },
  { label: 'Mouse em Sessões', note: 'O nome diz "Sessões recentes": o clique abre o painel.', preview: { hover: 'sessoes', tip: 'sessoes' } },
  { label: 'Mouse no Terminal', note: 'Fica apagado, mas ainda acende e mostra o nome.', preview: { hover: 'terminal', tip: 'terminal' } },
  { label: 'Mouse no perfil', note: 'A letra fica um pouco mais fraca. O nome vem na dica do navegador, mais lenta.', preview: { hover: 'perfil', tip: 'perfil' } },
  { label: 'Mouse no uso', note: 'O quanto resta vem na dica do navegador.', preview: { hover: 'uso:anthropic', tip: 'uso:anthropic' } },
  { label: 'Mouse em Ajustes', note: 'Abre os ajustes e a conta.', preview: { hover: 'ajustes', tip: 'ajustes' } },
  { label: 'Foco pelo teclado', note: 'Tab passa pelos itens; o anel marca o item e o nome aparece.', preview: { focus: 'memoria', tip: 'memoria' } },
];

export default function PassarOMouseEFoco() {
  return (
    <Board title="Passar o mouse e foco" description="Cada tipo de item com o mouse em cima ou com o foco do teclado. A página atual é o Início em todos.">
      {CASES.map(item => (
        <Case key={item.label} label={item.label} note={item.note} zoom={1.5} reserve={80}>
          <SideMenu current="inicio" preview={item.preview} />
        </Case>
      ))}
    </Board>
  );
}
