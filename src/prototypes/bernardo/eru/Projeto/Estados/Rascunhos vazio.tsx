/** @studio-id 5qypjy5wggkrqgg8 */
// A project without drafts yet.
import { NEW_PROJECT } from '../../_components/data/projeto';
import { ProjectPage } from '../../_components/projeto/ProjectPage';

export default function RascunhosVazio() {
  return <ProjectPage data={NEW_PROJECT} tab="rascunhos" local />;
}
