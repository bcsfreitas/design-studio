/** @studio-id 62gjaq925r814ft2 */
// The usage meters at the foot of the column: one per provider, five bars of what is left in its tightest window,
// coloured by how much.
import { Board, Case, SideMenu } from './_menu/SideMenu';
import { ANTHROPIC, cardAt, OPENAI, QUIET, type UsageReading } from './_menu/usage';

const CASES: { label: string; note: string; usage: UsageReading }[] = [
  { label: 'Folga', note: 'Metade ou mais restante: verde.', usage: { cards: [ANTHROPIC, OPENAI] } },
  { label: 'Apertado', note: 'Menos da metade: amarelo.', usage: { cards: [cardAt(ANTHROPIC, 35), OPENAI] } },
  { label: 'Crítico', note: 'Menos de 20%: vermelho. Uma barra até zerar.', usage: { cards: [cardAt(ANTHROPIC, 8), cardAt(OPENAI, 45)] } },
  { label: 'Um provedor', note: 'Só aparece quem tem medidor; no máximo três.', usage: { cards: [cardAt(ANTHROPIC, 64)] } },
  { label: 'Sem medidor', note: 'Nenhum provedor com medidor: um ícone de medidor abre o resumo de todos.', usage: { cards: [], quiet: QUIET } },
];

export default function UsoDosModelos() {
  return (
    <Board title="Uso dos modelos" description="Os medidores no pé da coluna, por provedor: cinco barras do que resta na janela mais apertada, com a cor da faixa.">
      {CASES.map(item => (
        <Case key={item.label} label={item.label} note={item.note} zoom={1.5}>
          <SideMenu current="inicio" usage={item.usage} preview={{}} />
        </Case>
      ))}
    </Board>
  );
}
