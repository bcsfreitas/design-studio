/** @studio-id admdda2addm0cted */
// Início as Bernardo sees it today: two sessions answering, two waiting, Todoist's tasks and the recent sessions.
import { SESSIONS } from '../_components/data/workspace';
import { FOLDERS, HOME_TASKS, IN_PROGRESS, MODEL_PROJECTS, RECENT, folderOfProject } from '../_components/data/inicio';
import { HomeScreen } from './_home/HomeScreen';

export default function Inicio() {
  return (
    <HomeScreen
      inProgress={IN_PROGRESS}
      tasks={{ kind: 'pronto', tasks: HOME_TASKS }}
      recent={{ kind: 'pronto', sessions: RECENT }}
      projects={MODEL_PROJECTS}
      folders={FOLDERS}
      folder={folderOfProject('endless-harness')}
      week={SESSIONS}
    />
  );
}
