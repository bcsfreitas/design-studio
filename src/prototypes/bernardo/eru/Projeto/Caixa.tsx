/** @studio-id 72z28k5x12wdzsc8 */
// The Eru project's inbox, the files in .files/; a file opens its preview in the drawer.
import { ERU_PROJECT } from '../_components/data/projeto';
import { ProjectPage } from '../_components/projeto/ProjectPage';

export default function Caixa() {
  return <ProjectPage data={ERU_PROJECT} tab="caixa" />;
}
