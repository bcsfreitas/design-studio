/** @studio-id 4kgfc0p8b3z4pxj9 */
// What a click on the gear at the foot of the column opens: Ajustes e conta, anchored beside it. The profile with the
// switch, the usage of each provider, the daylight, the sky's motion, the connection and Sair.
import { Board, Case, SideMenu } from './_menu/SideMenu';
import type { MenuPreview } from './_menu/IconColumn';
import type { AccountState } from './_menu/AccountSettings';

const OPEN: MenuPreview = { open: 'ajustes' };

const CASES: { label: string; note: string; account: AccountState; preview?: MenuPreview }[] = [
  { label: 'Aberto', note: 'A engrenagem acende e o cartão abre ao lado, alinhado pelo pé.', account: {} },
  { label: 'Uso de um provedor', note: 'Cada provedor é uma linha; o clique abre as janelas ali mesmo.', account: { usageOpen: true } },
  { label: 'Luz fixa e céu parado', note: 'Escolher a luz já aplica. O interruptor pausa o movimento do céu.', account: { daylight: 'noite', moving: false } },
  { label: 'Conexão com problema', note: 'Um ponto no canto da engrenagem avisa, mesmo fechado; dentro, a linha diz o quê.', account: { connection: 'reconnecting', plugin: 'missing' } },
  { label: 'Dashboard fora do ar', note: 'Ponto vermelho: o eru não fala com o Hermes.', account: { connection: 'unavailable', plugin: 'failing' }, preview: {} },
  { label: 'Sair falhou', note: 'Sair fica em vermelho; se não der, avisa logo abaixo.', account: { signOutFailed: true } },
];

export default function AjustesEConta() {
  return (
    <Board title="Ajustes e conta" description="O que abre ao clicar na engrenagem no pé da coluna. Fecha com o X, clicando fora ou com Esc.">
      {CASES.map(item => (
        <Case key={item.label} label={item.label} note={item.note} zoom={1.25} reserve={item.preview ? 0 : 370}>
          <SideMenu current="inicio" account={item.account} preview={item.preview ?? OPEN} />
        </Case>
      ))}
    </Board>
  );
}
