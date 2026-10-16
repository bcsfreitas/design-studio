/** @studio-id pvc793f6jn1c2a7e */
// An empty inbox: drop files anywhere on the tab or use Enviar arquivo.
import { NEW_PROJECT } from '../../_components/data/projeto';
import { ProjectPage } from '../../_components/projeto/ProjectPage';

export default function CaixaVazia() {
  return <ProjectPage data={NEW_PROJECT} tab="caixa" local />;
}
