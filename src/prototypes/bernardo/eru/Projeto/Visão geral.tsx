/** @studio-id gec2bk6ng7q6hq7c */
// The Eru project's page on its overview, as today: one session answering, one waiting, the board's blocked cards, the
// latest drafts and notes, two servers on and the recent sessions.
import { ERU_PROJECT } from '../_components/data/projeto';
import { ProjectPage } from '../_components/projeto/ProjectPage';

export default function VisaoGeral() {
  return <ProjectPage data={ERU_PROJECT} tab="visao-geral" />;
}
