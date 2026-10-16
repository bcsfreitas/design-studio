// Sample data shared by every screen, so Início, the sessions panel, the sessions list and a project's page tell the same
// story. It mirrors Bernardo's real workspace on the default profile. Times are minutes before "now".
export interface Project {
  id: string;
  label: string;
  path: string;
  seal: string;
  branch: string;
}

export interface Session {
  id: string;
  title: string;
  preview: string;
  projectId: string | null;
  minutesAgo: number;
  /** The agent is answering right now. */
  working?: boolean;
  /** The session asks for something: an approval or a question. */
  waiting?: 'aprovação' | 'pergunta';
  messages: number;
  model: string;
}

export interface Task {
  id: string;
  title: string;
  project: string;
  due: string;
  overdue?: boolean;
  priority?: 1 | 2 | 3;
}

export const PROFILE = { name: 'default', initial: 'D', user: 'Bernardo', model: 'Claude Opus 5.5' };

export const TODAY = 'Sexta-feira, 16 de outubro';

export const PROJECTS: Project[] = [
  { id: 'eru', label: 'Eru', path: '~/projects/eru', seal: 'gota', branch: 'main' },
  { id: 'endless-harness', label: 'Endless Harness', path: '~/projects/endless-harness', seal: 'tres-gotas', branch: 'main' },
  { id: 'harness', label: 'harness', path: '~/projects/harness', seal: 'horizonte-curvo', branch: 'main' },
  { id: 'biblioplex', label: 'Biblioplex', path: '~/projects/biblioplex', seal: 'aurora', branch: 'main' },
  { id: 'projects-home', label: 'Projects Home', path: '~/projects', seal: 'anel-com-fechos', branch: 'main' },
  { id: 'studio', label: 'studio', path: '~/projects/studio', seal: 'losango-duplo', branch: 'main' },
];

export const SESSIONS: Session[] = [
  { id: 's-design-studio', title: 'Instalar design-studio e começar trabalho', preview: 'Vou criar o sistema Eru. Primeiro, a prévia do comando.', projectId: 'endless-harness', minutesAgo: 0, working: true, messages: 94, model: 'Claude Opus 5.5' },
  { id: 's-prototipos', title: 'Trazer protótipos do Design Studio para o Eru', preview: 'As telas do eru como protótipos navegáveis, com dados de exemplo.', projectId: 'eru', minutesAgo: 0, working: true, messages: 31, model: 'Claude Opus 5.5' },
  { id: 's-wireframes', title: 'Wireframes de onboarding para educador independente #2', preview: 'O index.html do rascunho 2 (Sign Up) agora tem um modo de anotação: você marca o ponto e escreve a nota.', projectId: 'studio', minutesAgo: 1, messages: 48, model: 'Claude Opus 5.5' },
  { id: 's-captura', title: 'Investigar erro recorrente na captura de tela', preview: 'Esses dois avisos são as rodadas de verificação já incluídas no resumo acima. A primeira rodada é a que conta.', projectId: 'eru', minutesAgo: 36, messages: 22, model: 'Claude Opus 5.5' },
  { id: 's-mapa', title: 'Pesquisa: o mapa estelar do que o agente aprendeu', preview: 'Dois esboços do mapa com os dados reais do perfil default, um radial e um em faixas.', projectId: 'eru', minutesAgo: 95, waiting: 'pergunta', messages: 57, model: 'Claude Opus 5.5' },
  { id: 's-trocas', title: 'Listas lidas de verdade: da fila ao Turso', preview: 'A fila agora grava no Turso e a lista lê de lá; os testes de integração passam.', projectId: 'biblioplex', minutesAgo: 60 * 6 * 24, messages: 40, model: 'Claude Opus 5.5' },
  { id: 's-tema-claro', title: 'Só tema claro no harness', preview: 'Removi o toggle de modo e as classes dark: dos componentes.', projectId: 'harness', minutesAgo: 180, messages: 18, model: 'Claude Sonnet 5' },
  { id: 's-inicio', title: 'Página inicial dos projetos na rede de casa', preview: 'O início lista cada app no ar com o status ao vivo e o link pelo Tailscale.', projectId: 'projects-home', minutesAgo: 60 * 24, messages: 26, model: 'Claude Opus 5.5' },
  { id: 's-icones', title: 'Exportar os ícones dos papéis em SVG', preview: 'O zip tem os 12 ícones a 48 px, com traço em currentColor.', projectId: 'studio', minutesAgo: 60 * 3, waiting: 'aprovação', messages: 15, model: 'Claude Opus 5.5' },
  { id: 's-sudo', title: 'Pedidos de sudo e segredos com campo mascarado', preview: 'O cartão sigiloso mostra o pedido e esconde o que você digita.', projectId: null, minutesAgo: 60 * 26, messages: 12, model: 'Claude Opus 5.5' },
];

export const TASKS: Task[] = [
  { id: 't-permissions', title: 'Sketch permissions matrix across roles', project: 'Endless Access', due: '14 de out.', overdue: true, priority: 1 },
  { id: 't-invoice', title: 'Revisar a invoice de outubro', project: 'Pessoal', due: 'hoje', priority: 2 },
  { id: 't-roles', title: 'Review role icons export', project: 'Endless Access', due: 'hoje' },
];

export const projectById = (id: string | null) => PROJECTS.find(project => project.id === id) ?? null;

export const sessionsOf = (projectId: string) => SESSIONS.filter(session => session.projectId === projectId);

/** "agora", "1 min", "36 min", "há 3 h", "há 6 d", as eru writes recency. */
export function ago(minutes: number, prefix = false) {
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return prefix ? `há ${hours} h` : `${hours} h`;
  const days = Math.round(hours / 24);
  return prefix ? `há ${days} d` : `${days} d`;
}
