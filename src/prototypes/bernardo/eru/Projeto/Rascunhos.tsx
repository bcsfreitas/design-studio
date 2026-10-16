/** @studio-id 9e38zfdz36997tvt */
// The Eru project's drafts, grouped by type: covers, outcomes and the shots of drafts without a sheet.
import { ERU_PROJECT } from '../_components/data/projeto';
import { ProjectPage } from '../_components/projeto/ProjectPage';

export default function Rascunhos() {
  return <ProjectPage data={ERU_PROJECT} tab="rascunhos" />;
}
