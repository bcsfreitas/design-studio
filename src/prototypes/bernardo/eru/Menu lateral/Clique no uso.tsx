/** @studio-id b6asaqcvmxx6zjxb */
// What a click on the usage at the foot of the column opens: the card of that provider beside its meter, or, with no
// meter, the summary of every provider. Each card ends with Atualizar and the age of the reading.
import { Board, Case, SideMenu } from './_menu/SideMenu';
import type { MenuPreview } from './_menu/IconColumn';
import { ANTHROPIC, cardAt, OPENAI, QUIET, READING, type UsageReading } from './_menu/usage';

const CASES: { label: string; note: string; usage: UsageReading; preview: MenuPreview }[] = [
  { label: 'Anthropic', note: 'Cada medidor abre só o seu provedor: o plano, as janelas com quando zeram e o que resta.', usage: READING, preview: { open: 'uso:anthropic' } },
  { label: 'OpenAI', note: 'Quem cobra por API mostra também o gasto dos últimos 30 dias.', usage: READING, preview: { open: 'uso:openai' } },
  { label: 'Atualizando', note: 'Atualizar lê o uso de novo; o botão gira enquanto isso.', usage: READING, preview: { open: 'uso:anthropic', refreshing: true } },
  {
    label: 'Crítico e leitura antiga',
    note: 'A janela crítica fica em vermelho. Se o plugin quota não conseguiu ler de novo, a idade da leitura aparece.',
    usage: { ...READING, cards: [{ ...cardAt(ANTHROPIC, 8), stale: 'há 2 h', limit: 'No limite: volta em 41min' }, OPENAI] },
    preview: { open: 'uso:anthropic' },
  },
  {
    label: 'Janela que já zerou',
    note: 'Quando uma janela zera depois da leitura, o número some até atualizar.',
    usage: { ...READING, cards: [{ ...ANTHROPIC, windows: [{ label: '5 horas', remaining: null }, ...ANTHROPIC.windows.slice(1)] }, OPENAI] },
    preview: { open: 'uso:anthropic' },
  },
  {
    label: 'Atualizar falhou',
    note: 'O erro aparece acima do botão; os números de antes continuam.',
    usage: { ...READING, failure: 'O plugin quota não respondeu a tempo.', note: 'Reinicie o dashboard para o plugin do eru ler o plugin quota; até lá, só aparece o que o Hermes mede.' },
    preview: { open: 'uso:anthropic' },
  },
  { label: 'Sem medidor: todos', note: 'Sem nenhum medidor, o ícone abre o resumo do perfil, com quem não tem medidor e por quê.', usage: { cards: [], quiet: QUIET, readAgo: 'há 3 min' }, preview: { open: 'uso' } },
];

export default function CliqueNoUso() {
  return (
    <Board title="Clique no uso" description="O que abre ao clicar num medidor no pé da coluna: um cartão ao lado dele, com as janelas do provedor. Fecha clicando fora ou com Esc.">
      {CASES.map(item => (
        <Case key={item.label} label={item.label} note={item.note} zoom={1.25} reserve={400}>
          <SideMenu current="inicio" usage={item.usage} preview={item.preview} />
        </Case>
      ))}
    </Board>
  );
}
