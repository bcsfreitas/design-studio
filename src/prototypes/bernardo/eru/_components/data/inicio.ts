// Início's sample data on top of workspace.ts: the projects around the astrolabe (most active first, the first on top), the
// week's sessions as dots, today's schedule runs, and the home lists derived from SESSIONS and TASKS.
import { PROJECTS, SESSIONS, TASKS, projectById, type Session, type Task } from './workspace';

export interface ModelProject {
  id: string;
  label: string;
  seal: string;
  path: string;
  sessions: number;
  lastActive: string;
}

const STATS: Record<string, { sessions: number; lastActive: string }> = {
  eru: { sessions: 49, lastActive: 'agora' },
  harness: { sessions: 18, lastActive: 'há 3 h' },
  'projects-home': { sessions: 15, lastActive: 'há 1 d' },
  studio: { sessions: 6, lastActive: 'há 1 min' },
  biblioplex: { sessions: 4, lastActive: 'há 6 d' },
  'endless-harness': { sessions: 1, lastActive: 'agora' },
};

export const MODEL_PROJECTS: ModelProject[] = ['eru', 'harness', 'projects-home', 'studio', 'biblioplex', 'endless-harness'].map(id => {
  const project = projectById(id)!;
  return { id, label: project.label, seal: project.seal, path: project.path, sessions: STATS[id].sessions, lastActive: STATS[id].lastActive };
});

export interface FolderChoice {
  path: string;
  title: string;
  /** False for the profile's default folder, drawn with the star. */
  seal: string | false;
}

export const DEFAULT_FOLDER: FolderChoice = { path: '~', title: 'Projeto padrão', seal: false };

export const FOLDERS: FolderChoice[] = [DEFAULT_FOLDER, ...PROJECTS.map(project => ({ path: project.path, title: project.label, seal: project.seal }))];

export const folderOfProject = (projectId: string | null) => PROJECTS.find(project => project.id === projectId)?.path ?? null;

export const projectOfFolder = (path: string | null) => PROJECTS.find(project => project.path === path)?.id ?? null;

export type LiveState = 'working' | 'waiting';

export interface HomeRow {
  session: Session;
  state?: LiveState;
}

/** In progress: the sessions working now or waiting for an answer, as the gateway reports them. */
export const IN_PROGRESS: HomeRow[] = SESSIONS.filter(session => session.working || session.waiting).map(session => ({
  session,
  state: session.working ? 'working' : 'waiting',
}));

const busy = new Set(IN_PROGRESS.map(row => row.session.id));

export const RECENT: Session[] = SESSIONS.filter(session => !busy.has(session.id))
  .slice()
  .sort((a, b) => a.minutesAgo - b.minutesAgo)
  .slice(0, 3);

export const HOME_TASKS: Task[] = TASKS;

/** How long ago each in-progress session started, for its body on today's ring. */
const STARTED: Record<string, number> = { 's-design-studio': 140, 's-prototipos': 95, 's-mapa': 260, 's-icones': 410 };

export interface WeekDot {
  id: string;
  project: string | null;
  hour: number;
  days: number;
  messages: number;
}

const OLDER: [string | null, number, number, number][] = [
  ['eru', 1, 9.5, 40], ['eru', 1, 14.2, 12], ['eru', 1, 21.7, 60], ['harness', 1, 16.4, 8], ['studio', 1, 11, 22],
  ['eru', 2, 10.3, 33], ['eru', 2, 15.8, 4], ['projects-home', 2, 20.1, 18], [null, 2, 13.4, 6], ['harness', 2, 9.1, 28],
  ['eru', 3, 8.7, 51], ['eru', 3, 12.6, 9], ['harness', 3, 17.3, 14], ['projects-home', 3, 22.4, 30], [null, 3, 19.2, 3],
  ['eru', 4, 10.9, 70], ['studio', 4, 14.6, 16], ['harness', 4, 18.8, 24], ['eru', 4, 23.1, 7],
  ['biblioplex', 5, 9.8, 40], ['eru', 5, 13.9, 26], ['projects-home', 5, 16.2, 11], [null, 5, 20.6, 5],
  ['biblioplex', 6, 11.4, 22], ['eru', 6, 15.1, 38], ['harness', 6, 18.3, 9], ['studio', 6, 21.2, 13],
];

const hourOf = (date: Date) => date.getHours() + date.getMinutes() / 60;

function minutesBefore(now: Date, minutes: number) {
  return new Date(now.valueOf() - minutes * 60_000);
}

function daysBefore(now: Date, date: Date) {
  const day = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate()).valueOf();
  return Math.round((day(now) - day(date)) / 86_400_000);
}

/** The astrolabe's week: the sample sessions where they fall from now, plus older ones on the six rings before today. */
export function weekDots(now: Date, sessions: Session[] = SESSIONS): WeekDot[] {
  if (sessions.length === 0) return [];
  const recent = sessions
    .filter(session => !busy.has(session.id))
    .map(session => {
      const start = minutesBefore(now, session.minutesAgo + Math.min(90, session.messages * 2));
      return { id: session.id, project: session.projectId, hour: hourOf(start), days: daysBefore(now, start), messages: session.messages };
    });
  const older = OLDER.map(([project, days, hour, messages], index) => ({ id: `w-${index}`, project, hour, days, messages }));
  return [...recent, ...older].filter(dot => dot.days >= 0 && dot.days < 7);
}

export function liveBodies(now: Date, rows: HomeRow[] = IN_PROGRESS) {
  return rows.map(({ session, state }) => {
    const start = minutesBefore(now, STARTED[session.id] ?? 30);
    return { id: session.id, project: session.projectId, hour: hourOf(start), working: state === 'working' };
  });
}

const RUN_HOURS: { id: string; hour: number }[] = [
  { id: 'dashboard-manha', hour: 6 + 37 / 60 },
  { id: 'todoist-kanban-9', hour: 9 },
  { id: 'todoist-kanban-11', hour: 11 },
  { id: 'invoice', hour: 12 },
  { id: 'todoist-kanban-13', hour: 13 },
  { id: 'todoist-kanban-15', hour: 15 },
  { id: 'todoist-kanban-17', hour: 17 },
  { id: 'dashboard-tarde', hour: 18 + 37 / 60 },
  { id: 'todoist-kanban-19', hour: 19 },
];

/** Today's schedule runs: done, the next one lit, and the later ones. */
export function todaySatellites(now: Date) {
  const hour = hourOf(now);
  const next = RUN_HOURS.find(run => run.hour > hour)?.id;
  return RUN_HOURS.map(run => ({ ...run, state: run.hour <= hour ? ('feito' as const) : run.id === next ? ('proximo' as const) : ('depois' as const) }));
}
