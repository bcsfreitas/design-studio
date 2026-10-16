/** @studio-id 0c2x9r8m6fqn40as */
// State: Todoist isn't connected. The tasks card shows eru's warning about the missing token, without retry, and the summary
// leaves the tasks out.
import { SESSIONS } from '../../_components/data/workspace';
import { FOLDERS, IN_PROGRESS, MODEL_PROJECTS, RECENT, folderOfProject } from '../../_components/data/inicio';
import { HomeScreen, TODOIST_TOKEN_MISSING } from '../_home/HomeScreen';

export default function SemTodoist() {
  return (
    <HomeScreen
      inProgress={IN_PROGRESS}
      tasks={{ kind: 'erro', problem: TODOIST_TOKEN_MISSING }}
      recent={{ kind: 'pronto', sessions: RECENT }}
      projects={MODEL_PROJECTS}
      folders={FOLDERS}
      folder={folderOfProject('endless-harness')}
      week={SESSIONS}
    />
  );
}
