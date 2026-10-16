/** @studio-id xw43c5cq1qf8phrt */
// A board without cards and without a place for the issues: the five columns say Nenhum card.
import { NEW_PROJECT } from '../../_components/data/projeto';
import { ProjectPage } from '../../_components/projeto/ProjectPage';

export default function QuadroVazio() {
  return <ProjectPage data={NEW_PROJECT} tab="quadro" local />;
}
