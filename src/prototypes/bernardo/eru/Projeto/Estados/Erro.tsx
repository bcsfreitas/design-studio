/** @studio-id gfphpk1q9sa70zvs */
// The plugin's folder routes failing: the board, drafts, notes and inbox show eru's error with "Tentar de novo", and the
// overview keeps only what comes from elsewhere (sessions and servers). Trying again loads the page.
import { ERU_PROJECT } from '../../_components/data/projeto';
import { ProjectPage } from '../../_components/projeto/ProjectPage';

export default function Erro() {
  return <ProjectPage data={ERU_PROJECT} tab="quadro" status="erro" local />;
}
