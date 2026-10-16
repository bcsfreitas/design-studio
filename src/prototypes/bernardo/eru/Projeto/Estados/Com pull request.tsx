/** @studio-id ng6r5j0vrq93jkdn */
// Eru on a feature branch: the header shows the branch, its open pull request and the checks, one still running.
import { ERU_ON_BRANCH } from '../../_components/data/projeto';
import { ProjectPage } from '../../_components/projeto/ProjectPage';

export default function ComPullRequest() {
  return <ProjectPage data={ERU_ON_BRANCH} tab="visao-geral" local />;
}
