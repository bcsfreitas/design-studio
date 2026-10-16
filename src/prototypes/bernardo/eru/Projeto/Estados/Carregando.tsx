/** @studio-id m7mh350hbbe7s2ez */
// While the project list and the folder's routes load: the folder's name without a seal in the bar, the header and the
// field, no blocks yet; each tab shows its skeleton lines.
import { ERU_PROJECT } from '../../_components/data/projeto';
import { ProjectPage } from '../../_components/projeto/ProjectPage';

export default function Carregando() {
  return <ProjectPage data={ERU_PROJECT} tab="visao-geral" status="carregando" local />;
}
