/** @studio-id c7nckdhv4rb8kgeb */
// The Eru project's board: the five columns; a card opens in the drawer, where its actions move it.
import { ERU_PROJECT } from '../_components/data/projeto';
import { ProjectPage } from '../_components/projeto/ProjectPage';

export default function Quadro() {
  return <ProjectPage data={ERU_PROJECT} tab="quadro" />;
}
