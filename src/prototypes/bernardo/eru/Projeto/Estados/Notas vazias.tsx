/** @studio-id gh2f910zpzvaazya */
// A project without notes yet.
import { NEW_PROJECT } from '../../_components/data/projeto';
import { ProjectPage } from '../../_components/projeto/ProjectPage';

export default function NotasVazias() {
  return <ProjectPage data={NEW_PROJECT} tab="notas" local />;
}
