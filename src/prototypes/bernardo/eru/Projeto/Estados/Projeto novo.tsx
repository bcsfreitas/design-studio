/** @studio-id vwxnayffvy0k05b9 */
// A project just created: the overview has only the header, the field and the engineering skills to configure; every tab is empty.
import { NEW_PROJECT } from '../../_components/data/projeto';
import { ProjectPage } from '../../_components/projeto/ProjectPage';

export default function ProjetoNovo() {
  return <ProjectPage data={NEW_PROJECT} tab="visao-geral" local />;
}
