/** @studio-id cvq87amxrc73wef8 */
// The Eru project's notes in .notes/; a note opens in the editor, and Nota nova starts a blank one.
import { ERU_PROJECT } from '../_components/data/projeto';
import { ProjectPage } from '../_components/projeto/ProjectPage';

export default function Notas() {
  return <ProjectPage data={ERU_PROJECT} tab="notas" />;
}
