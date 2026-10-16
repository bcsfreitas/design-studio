// The sessions list and the recent sessions panel: the shared sessions plus older ones, with what eru reads from
// `projects.tree` (session counts per project) and the session source. "Now" is Friday, 16 October 2026, 15:40.
import { PROJECTS, SESSIONS, type Project, type Session } from './workspace';

export interface ListedSession extends Session {
  /** Where the session was born when it was not eru or the desktop app: kanban, cron, slack, tui... */
  source?: string;
  archived?: boolean;
  /** The session's branch when it differs from the project's. */
  branch?: string;
}

const NOW_MINUTES = 15 * 60 + 40;

const OLDER: ListedSession[] = [
  { id: 's-pocock', title: 'Set up Matt Pocock skills #2', preview: 'O eru já está configurado, e a configuração atual cobre tudo o que os modelos da skill pedem. Não mudei nada.', projectId: 'eru', minutesAgo: 62, messages: 20, model: 'Claude Opus 5.5' },
  { id: 's-uso', title: 'Pesquisa: uso por dia, por modelo e por skill #2', preview: '# Kanban task t_d99beb7d: Pesquisa: uso por dia, por modelo e por skill', projectId: null, minutesAgo: 125, messages: 9, model: 'Claude Opus 5.5', source: 'kanban' },
  { id: 's-sem-titulo', title: '', preview: '', projectId: null, minutesAgo: 128, messages: 2, model: 'Claude Opus 5.5', source: 'kanban' },
  { id: 's-canvas', title: 'Exportar canvas do fundo da home em SVG', preview: 'Gerei a versão limpa, só com o padrão: ~/projects/eru/.scratch/exportes/padrao-astrolabio.svg (1366 × 882 px).', projectId: 'eru', minutesAgo: 140, messages: 33, model: 'Claude Opus 5.5' },
  { id: 's-wireframe-skill', title: 'Instalar claude-wireframe-skill do GitHub', preview: 'A skill de wireframe agora escreve em rascunhos, no formato que a aba Rascunhos do eru lê. Ainda não testei no celular.', projectId: 'harness', minutesAgo: 200, messages: 27, model: 'Claude Opus 5.5' },
  { id: 's-banco', title: 'Banco MCP Finance Sync para Personal Ingestion', preview: 'Relatório de 16/10 salvo em ~/Vaults/Personal/ingestion/financas-2026-10-16.md.', projectId: null, minutesAgo: 910, messages: 6, model: 'gpt-5.5', source: 'cron' },
  { id: 's-conceito', title: 'Conceito visual 2D geométrico para home', preview: 'Três direções: constelação, astrolábio e mapa em faixas. A do astrolábio conversa melhor com o eru.', projectId: 'projects-home', minutesAgo: 60 * 24 + 30, messages: 19, model: 'Claude Opus 5.5' },
  { id: 's-copy', title: 'Adicionar botão Copy com dropdown aos códigos do cohort', preview: 'O botão copia o código e o menu oferece o link de convite.', projectId: 'studio', minutesAgo: 60 * 24 * 3, messages: 41, model: 'Claude Opus 5.5', branch: 'cohort-codes-copy-dropdown' },
  { id: 's-pasta', title: 'Listar conteúdo da pasta', preview: 'A pasta tem 14 apps; 11 estão no ar.', projectId: 'projects-home', minutesAgo: 60 * 24 * 2, messages: 4, model: 'Claude Sonnet 5', source: 'tui' },
  { id: 's-other', title: 'Remover seção Other e enviar para main', preview: 'Removi a seção e abri o PR #31; os testes passam.', projectId: 'harness', minutesAgo: 60 * 24 * 8, messages: 16, model: 'Claude Opus 5.5' },
  { id: 's-slack', title: 'Mensagem no Slack pedindo input sobre o onboarding', preview: 'Rascunho enviado no canal #design, marcando a Ana e o Pedro.', projectId: 'harness', minutesAgo: 60 * 24 * 9, messages: 7, model: 'Claude Opus 5.5', source: 'slack' },
  { id: 's-editor', title: 'Checkout branch editor-text-color e verificar o build', preview: 'O build passa; a cor do texto no editor agora segue o tema.', projectId: 'studio', minutesAgo: 60 * 24 * 15, messages: 12, model: 'Claude Opus 5.5', branch: 'editor-text-color' },
];

const ARCHIVED: ListedSession[] = [
  { id: 's-arq-tema', title: 'Testar tema sépia no leitor', preview: 'O sépia ficou bom no papel, mas some no céu da noite.', projectId: 'eru', minutesAgo: 60 * 24 * 12, messages: 14, model: 'Claude Opus 5.5', archived: true },
  { id: 's-arq-backup', title: 'Backup dos perfis antes da limpeza', preview: 'Backup em ~/.hermes/backups/profiles-2026-10-05/.', projectId: null, minutesAgo: 60 * 24 * 11, messages: 5, model: 'Claude Opus 5.5', archived: true },
];

const byRecency = (a: Session, b: Session) => a.minutesAgo - b.minutesAgo;

/** Every session of the profile, the most recent first. */
export const ALL_SESSIONS: ListedSession[] = [...SESSIONS, ...OLDER].sort(byRecency);

export const ARCHIVED_SESSIONS: ListedSession[] = [...ARCHIVED].sort(byRecency);

/** How many sessions each project has on the dashboard, as `projects.tree` counts them; `null` is "Sem projeto". */
export const SESSION_COUNTS: Record<string, number> = {
  eru: 49,
  harness: 18,
  'projects-home': 15,
  studio: 6,
  biblioplex: 4,
  'endless-harness': 1,
  none: 75,
};

export interface ProjectNode {
  id: string;
  label: string;
  project: Project | null;
  sessionCount: number;
}

export const NO_PROJECT_LABEL = 'Sem projeto';

const nodeOf = (project: Project | null): ProjectNode => ({
  id: project?.id ?? 'none',
  label: project?.label ?? NO_PROJECT_LABEL,
  project,
  sessionCount: SESSION_COUNTS[project?.id ?? 'none'] ?? 0,
});

/** The projects that have sessions, as the panel lists them: the most recently active first. */
export function panelProjects(): ProjectNode[] {
  const nodes = [...PROJECTS.map(nodeOf), nodeOf(null)].filter(node => node.sessionCount > 0);
  const last = (node: ProjectNode) => sessionsOfNode(node)[0]?.minutesAgo ?? Infinity;
  return nodes.sort((a, b) => last(a) - last(b));
}

/** The project filter on the Sessões page: from the most sessions to the fewest, "Sem projeto" last. */
export function chipProjects(): ProjectNode[] {
  return [...PROJECTS.map(nodeOf), nodeOf(null)].filter(node => node.sessionCount > 0).sort((a, b) => Number(a.project === null) - Number(b.project === null) || b.sessionCount - a.sessionCount);
}

export function sessionsOfNode(node: ProjectNode, sessions: ListedSession[] = ALL_SESSIONS) {
  return sessions.filter(session => (session.projectId ?? 'none') === node.id);
}

/** "168 sessões · 6 projetos", for the page bar. */
export function sessionsSummary(nodes: ProjectNode[]) {
  const sessions = nodes.reduce((total, node) => total + node.sessionCount, 0);
  const projects = nodes.filter(node => node.project !== null && node.sessionCount > 0).length;
  return `${plural(sessions, 'sessão', 'sessões')} · ${plural(projects, 'projeto', 'projetos')}`;
}

export function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

export function sessionLabel(session: Pick<Session, 'title' | 'preview'>) {
  return session.title.trim() || session.preview.trim() || 'Sessão sem título';
}

/** Short age for narrow lists: 5 min, 3 h, 2 d, 3 sem; after a month, the date. */
export function shortAge(minutes: number) {
  if (minutes >= 30 * 24 * 60) return dayLabel(minutes);
  const units: [string, number][] = [['sem', 7 * 24 * 60], ['d', 24 * 60], ['h', 60], ['min', 1]];
  for (const [unit, size] of units) {
    if (minutes >= size) return `${Math.floor(minutes / size)} ${unit}`;
  }
  return 'agora';
}

/** Hoje, Ontem or the date ("9 de outubro"), as the grouped lists label a day. */
export function dayLabel(minutesAgo: number) {
  if (minutesAgo <= NOW_MINUTES) return 'Hoje';
  const daysBack = Math.ceil((minutesAgo - NOW_MINUTES) / (24 * 60));
  if (daysBack === 1) return 'Ontem';
  const day = 16 - daysBack;
  return day >= 1 ? `${day} de outubro` : `${30 + day} de setembro`;
}

/** The sessions in groups by day, in the order they came. */
export function byDay(sessions: ListedSession[]) {
  const groups = new Map<string, ListedSession[]>();
  for (const session of sessions) {
    const day = dayLabel(session.minutesAgo);
    groups.set(day, [...(groups.get(day) ?? []), session]);
  }
  return [...groups];
}

/** Where the session came from when it was not eru or the desktop app, as the row names it. */
const ORIGINS: Record<string, string> = { tui: 'terminal', cli: 'terminal', cron: 'agendamento', telegram: 'Telegram', slack: 'Slack', kanban: 'Kanban', email: 'e-mail' };

export function sessionOrigin(source: string | undefined) {
  return source ? (ORIGINS[source] ?? source) : null;
}

/** The search snippet with the matched text between >>> and <<<, as the Hermes search returns it. */
export function searchSessions(text: string, sessions: ListedSession[] = ALL_SESSIONS) {
  const needle = text.trim().toLowerCase();
  if (!needle) return [];
  return sessions.flatMap(session => {
    const source = [session.preview, session.title].find(value => value.toLowerCase().includes(needle));
    if (!source) return [];
    const at = source.toLowerCase().indexOf(needle);
    const start = Math.max(0, at - 40);
    const snippet = `${start > 0 ? '…' : ''}${source.slice(start, at)}>>>${source.slice(at, at + needle.length)}<<<${source.slice(at + needle.length, at + needle.length + 80)}`;
    return [{ session, snippet }];
  });
}
