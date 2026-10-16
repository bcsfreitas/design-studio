// Sample data for a session page: the turns of "Instalar design-studio e começar trabalho" (Endless Harness), the live turn,
// the pending approval and question, and what the rail panels show. Shapes follow eru's transcript trail (features/transcript/trail.ts).
import { PROJECTS, SESSIONS } from './workspace';

export type ToolKind = 'terminal' | 'code' | 'read' | 'edit' | 'search' | 'web' | 'page' | 'browser' | 'delegate' | 'skill' | 'memory' | 'question' | 'other';
export type StepIcon = ToolKind | 'reasoning' | 'approved' | 'denied';

export interface Touch {
  kind: 'file' | 'search' | 'page';
  label: string;
  path?: string;
}

export interface Tool {
  id: string;
  name: string;
  label: string;
  icon: ToolKind;
  args?: Record<string, unknown>;
  result?: string;
  running?: boolean;
}

export interface TrailStep {
  kind: 'step';
  key: string;
  label: string;
  icon: StepIcon;
  state: 'running' | 'done' | 'failed';
  duration?: number;
  touches: Touch[];
  reasoning?: string[];
  tools: Tool[];
  /** The decision on a step that asked for approval. */
  decision?: 'approved' | 'denied';
}

export type TaskState = 'running' | 'completed' | 'failed' | 'interrupted' | 'ended';

export interface TrailTask {
  key: string;
  goal: string;
  state: TaskState;
  activity?: string;
}

export interface TrailBranch {
  kind: 'branch';
  key: string;
  branch: 'parallel' | 'error' | 'agents';
  steps: TrailStep[];
  tasks: TrailTask[];
}

export interface TrailText {
  kind: 'text';
  key: string;
  text: string;
}

export interface TrailNotice {
  kind: 'notice';
  key: string;
  text: string;
}

export interface TrailSteer {
  kind: 'steer';
  key: string;
  text: string;
}

export type TrailItem = TrailStep | TrailBranch | TrailText | TrailNotice | TrailSteer;

export interface UserEntry {
  kind: 'user';
  key: string;
  text: string;
  /** "15:06", as eru writes the hour under the ask. */
  time: string;
  attachments?: { name: string; kind: 'file' | 'image' }[];
}

export interface AssistantEntry {
  kind: 'assistant';
  key: string;
  status: 'complete' | 'running' | 'interrupted' | 'error';
  items: TrailItem[];
  /** Seconds between the ask and the end of the turn. */
  took?: number;
  endTime?: string;
  /** The turn this tab watched happen: it stays open when it ends. */
  watched?: boolean;
  error?: string;
}

export type TranscriptEntry = UserEntry | AssistantEntry;

export const SESSION = SESSIONS.find(session => session.id === 's-design-studio')!;
export const SESSION_PROJECT = PROJECTS.find(project => project.id === SESSION.projectId)!;
export const SESSION_CWD = '/home/hermes/projects/endless-harness';
export const SESSION_CONTEXT = { branch: 'main', added: 16, removed: 12, servers: 1 };
export const SESSION_USAGE = { model: 'claude-opus-5-5', used: 92_400, max: 200_000 };

let serial = 0;
const key = (prefix: string) => `${prefix}-${++serial}`;

function tool(name: string, label: string, icon: ToolKind, args?: Record<string, unknown>, result?: string): Tool {
  return { id: key('tool'), name, label, icon, args, result };
}

function step(label: string, icon: StepIcon, options: Partial<Omit<TrailStep, 'kind' | 'label' | 'icon'>> = {}): TrailStep {
  return { kind: 'step', key: key('step'), label, icon, state: 'done', touches: [], tools: [], ...options };
}

function thought(...reasoning: string[]): TrailStep {
  return step('Pensou', 'reasoning', { reasoning });
}

function file(path: string): Touch {
  return { kind: 'file', label: path.split('/').at(-1)!, path };
}

function text(value: string): TrailText {
  return { kind: 'text', key: key('text'), text: value };
}

function shell(command: string, output: string, options: Partial<TrailStep> = {}): TrailStep {
  return step('Rodou um comando no terminal', 'terminal', {
    tools: [tool('terminal', 'Rodou um comando no terminal', 'terminal', { command }, JSON.stringify({ output, exit_code: 0 }))],
    ...options,
  });
}

function read(paths: string[]): TrailStep {
  const tools = paths.map(path => tool('read_file', `Leu ${path.split('/').at(-1)}`, 'read', { path }, JSON.stringify({ content: '…' })));
  return step(paths.length === 1 ? tools[0].label : `Leu ${paths.length} arquivos`, 'read', { touches: paths.map(file), tools });
}

const FILLER: [string, StepIcon][] = [
  ['Pensou', 'reasoning'],
  ['Rodou um comando no terminal', 'terminal'],
  ['Leu 3 arquivos', 'read'],
  ['Pensou', 'reasoning'],
  ['Editou 2 arquivos', 'edit'],
  ['Rodou um script', 'code'],
  ['Procurou por "eru-theme"', 'search'],
];

/** The 94 steps of the long turn: they only show when its trail opens. */
function longTurnSteps(count: number, from: number): TrailStep[] {
  return Array.from({ length: count }, (_, index) => {
    const [label, icon] = FILLER[(index + from) % FILLER.length];
    return step(label, icon);
  });
}

const THEME = `${SESSION_CWD}/src/systems/eru/styles/theme.css`;
const SHELL = `${SESSION_CWD}/src/prototypes/bernardo/eru/_components/shell/AppShell.tsx`;
const AREAS = `${SESSION_CWD}/src/prototypes/bernardo/eru/_components/shell/areas.ts`;
const WORKSPACE = `${SESSION_CWD}/src/prototypes/bernardo/eru/_components/data/workspace.ts`;

const ANSWER = `O \`pnpm check\` passa agora. O único problema era um seletor de irmão (\`a + b\`) que sobrou no tema: o estúdio não aceita nada depois da classe do tema além de descendente ou filho, então embrulhei em \`:is(...)\`, que mantém o mesmo significado.

A moldura ficou num componente só, que todas as telas usam:

\`\`\`tsx
<AppShell current="sessoes" sky={{ seal: project.seal }} fill rail={<SessionRail />}>
  <SessionColumn turns={turns} />
</AppShell>
\`\`\`

- **\`current\`** marca a área na coluna de ícones.
- **\`sky\`** desenha o céu do projeto atrás do cartão.
- **\`rail\`** fica na borda direita do cartão, fora da rolagem.

Dois subagentes ainda estão montando as telas, o do Projeto terminou e o das outras áreas parou num erro de tipos, que eu corrijo em seguida. Quando todos terminarem, confiro cada tela no modo claro e no escuro.`;

export const FINISHED_TURNS: TranscriptEntry[] = [
  { kind: 'user', key: 'ask-1', time: '14:56', text: 'Instala o design-studio do Pat em ~/projects/endless-harness, roda como serviço e me registra como colaborador.' },
  {
    kind: 'assistant',
    key: 'reply-1',
    status: 'complete',
    took: 6 * 60 + 12,
    endTime: '15:02',
    items: [
      ...longTurnSteps(9, 0),
      text('Clonei o fork em `~/projects/endless-harness`, com o `upstream` apontando para o repositório do Pat, e instalei as dependências com as versões do `mise.toml`.'),
      ...longTurnSteps(9, 3),
      text('O estúdio está no ar em **http://192.168.68.102:5180** como o serviço `design-studio.service`, e você está registrado como colaborador `bernardo`.'),
    ],
  },
  { kind: 'user', key: 'ask-2', time: '15:06', text: 'Agora traz o eru para dentro: um sistema com os componentes e o tema dele, e um protótipo com todas as telas.' },
  {
    kind: 'assistant',
    key: 'reply-2',
    status: 'complete',
    took: 34 * 60 + 8,
    endTime: '15:40',
    items: [
      ...longTurnSteps(12, 1),
      text('Escopo grande. Vou em etapas: primeiro o sistema Eru (base de tudo), depois as telas. Começo pelas regras do estúdio para criar sistemas e protótipos.'),
      ...longTurnSteps(20, 2),
      text('O estúdio é rígido com temas: tudo precisa ficar escopado em `.eru-theme`, os tokens são inventário declarado e as animações levam prefixo. Faço a conversão com um script que reescreve cada seletor.'),
      ...longTurnSteps(30, 4),
      text('O tema funciona: tons de papel quente no modo claro, cor de destaque e tipografia do eru. Os 37 componentes aparecem no sistema. Antes de seguir, salvo este estágio num commit.'),
      ...longTurnSteps(32, 5),
      text('Agora os protótipos. Todas as telas dividem a mesma moldura do eru (barra de ícones, barra da página, painel lateral), então ela vem primeiro.'),
    ],
  },
  { kind: 'user', key: 'ask-3', time: '16:41', text: 'Antes de dividir as telas, confere se o tema passa no pnpm check e me mostra como ficou o AppShell.', attachments: [{ name: 'eru-sessao.png', kind: 'image' }] },
  {
    kind: 'assistant',
    key: 'reply-3',
    status: 'complete',
    took: 7 * 60 + 41,
    endTime: '16:49',
    watched: true,
    items: [
      thought('O Bernardo quer duas coisas: o check verde e ver a moldura. Começo pelo check, porque se o tema quebrar as telas também quebram.'),
      read([SHELL, AREAS, THEME]),
      shell('pnpm check', '✖ src/systems/eru/styles/theme.css: ".eru-theme .turns > li + li" escapes .eru-theme.', {
        label: 'Beco sem saída: o comando terminou com erro',
        state: 'failed',
        duration: 38,
      }),
      thought('Sobrou um seletor de irmão. O estúdio só aceita descendente ou filho depois da classe do tema; `:is()` resolve sem mudar o significado.'),
      {
        kind: 'branch',
        key: key('branch'),
        branch: 'error',
        tasks: [],
        steps: [step('Beco sem saída: o arquivo não existe', 'read', { state: 'failed', touches: [file(`${SESSION_CWD}/src/systems/eru/styles/index.css`)], tools: [tool('read_file', 'Leu index.css', 'read', { path: 'src/systems/eru/styles/index.css' }, JSON.stringify({ error: 'File not found: src/systems/eru/styles/index.css' }))] })],
      },
      {
        kind: 'branch',
        key: key('branch'),
        branch: 'parallel',
        tasks: [],
        steps: [
          step('Procurou por " + " no tema', 'search', { touches: [{ kind: 'search', label: ' + ' }], duration: 2, tools: [tool('search_files', 'Procurou por " + " no tema', 'search', { pattern: ' \\+ ', path: 'src/systems/eru/styles' }, JSON.stringify({ output: 'theme.css:375\ntheme.css:379\ntheme.css:432\ntheme.css:770' }))] }),
          step('Leu workspace.ts', 'read', { touches: [file(WORKSPACE)], duration: 1, tools: [tool('read_file', 'Leu workspace.ts', 'read', { path: WORKSPACE }, JSON.stringify({ content: '…' }))] }),
        ],
      },
      step('Editou theme.css', 'edit', {
        touches: [file(THEME)],
        duration: 3,
        tools: [tool('patch', 'Editou theme.css', 'edit', { path: THEME, old_string: '.eru-theme .turns > li + li {', new_string: '.eru-theme :is(.turns > li + li) {' }, JSON.stringify({ diff: '-.eru-theme .turns > li + li {\n+.eru-theme :is(.turns > li + li) {' }))],
      }),
      shell('pnpm check', '✔ boundaries\n✔ theme tokens\n✔ 0 problems', { duration: 41 }),
      text('O check passa. Enquanto eu escrevo o resumo, quatro subagentes começam as telas, uma área cada, em segundo plano.'),
      {
        kind: 'branch',
        key: key('branch'),
        branch: 'agents',
        steps: [],
        tasks: [
          { key: 'task-1', goal: 'Build the Início (home) screen of the Eru prototype with its states, and port the sky canvas', state: 'running', activity: 'Rodando um comando no terminal' },
          { key: 'task-2', goal: 'Build the Sessão (agent conversation) screens of the Eru prototype with their states and the side rail panels', state: 'running', activity: 'Escrevendo Trail.tsx' },
          { key: 'task-3', goal: 'Build the project page (Projeto) of the Eru prototype: its five tabs and their states', state: 'completed', activity: 'As cinco abas do projeto estão prontas, com vazio e erro.' },
          { key: 'task-4', goal: 'Build the remaining areas: Sessões, Agendamentos, Memória, Arquivos, Perfis', state: 'failed', activity: 'O pnpm typecheck parou num erro em Memória.tsx.' },
        ],
      },
      step('Escreveu workspace.ts', 'edit', { touches: [file(WORKSPACE)], duration: 2, tools: [tool('write_file', 'Escreveu workspace.ts', 'edit', { path: WORKSPACE }, JSON.stringify({ output: 'ok' }))] }),
      step('Atualizou a skill design-studio-conventions', 'skill'),
      text(ANSWER),
    ],
  },
];

const PAST = FINISHED_TURNS.slice(0, 4);

const LIVE_ASK: UserEntry = { kind: 'user', key: 'ask-live', time: '16:52', text: 'Agora monta a tela da sessão com os estados e os painéis do trilho, igual ao eru de hoje.' };

/** The live turn: thinking, the steps so far, the steer the user sent midway and the step running now. */
export function liveTurn(last: TrailStep): TranscriptEntry[] {
  return [
    ...PAST,
    LIVE_ASK,
    {
      kind: 'assistant',
      key: 'reply-live',
      status: 'running',
      items: [
        thought('A sessão é a tela mais rica: o rastro, o campo, o trilho e quatro painéis. Começo lendo o código do eru.'),
        read([`/home/hermes/projects/eru/web/src/features/sessions/SessionPage.tsx`, `/home/hermes/projects/eru/web/src/features/transcript/Trail.tsx`, `/home/hermes/projects/eru/web/src/features/turn/Composer.tsx`]),
        { kind: 'steer', key: 'steer-1', text: 'usa os dados do workspace.ts, para as telas contarem a mesma história' },
        step('Escreveu session.ts', 'edit', { touches: [file(`${SESSION_CWD}/src/prototypes/bernardo/eru/_components/data/session.ts`)], duration: 4 }),
        text('Os dados estão prontos. Agora o rastro, que é a parte com mais detalhe.'),
        last,
      ],
    },
  ];
}

export const RUNNING_STEP: TrailStep = step('Rodando um comando no terminal', 'terminal', { state: 'running', tools: [{ id: 'tool-running', name: 'terminal', label: 'Rodando um comando no terminal', icon: 'terminal', args: { command: 'pnpm typecheck' }, running: true }] });

export const APPROVAL_COMMAND = 'rm -rf ~/projects/endless-harness/src/prototypes/bernardo/eru/Sessão/Placeholder';

export const APPROVAL_STEP: TrailStep = step('Rodando um comando no terminal', 'terminal', { state: 'running', tools: [{ id: 'tool-approval', name: 'terminal', label: 'Rodando um comando no terminal', icon: 'terminal', args: { command: APPROVAL_COMMAND }, running: true }] });

export const APPROVAL_REQUEST = {
  command: APPROVAL_COMMAND,
  reason: 'Apaga pastas e tudo o que há dentro delas.',
  scopes: ['once', 'session', 'always'] as const,
};

export const QUESTION_STEP: TrailStep = step('Fazendo uma pergunta', 'question', { state: 'running', tools: [{ id: 'tool-clarify', name: 'clarify', label: 'Fazendo uma pergunta', icon: 'question', running: true }] });

export interface ClarifyQuestion {
  qid: string;
  question: string;
  multi: boolean;
  choices: { value: string; recommended?: boolean }[];
}

export const QUESTIONS: ClarifyQuestion[] = [
  {
    qid: 'q1',
    question: 'O painel do terminal não tem o xterm no estúdio. Como imito a tela dele?',
    multi: false,
    choices: [{ value: 'Um pre com as cores do xterm do eru', recommended: true }, { value: 'Uma captura do terminal de verdade' }, { value: 'Deixar o painel vazio, só com as abas' }],
  },
  {
    qid: 'q2',
    question: 'Quais estados entram primeiro?',
    multi: true,
    choices: [{ value: 'Respondendo' }, { value: 'Pedindo aprovação' }, { value: 'Pergunta' }, { value: 'Carregando e erro' }],
  },
];

/** The interrupted turn: the user pressed stop while the agent ran the type check. */
export const INTERRUPTED_TURNS: TranscriptEntry[] = [
  ...PAST,
  LIVE_ASK,
  {
    kind: 'assistant',
    key: 'reply-interrupted',
    status: 'interrupted',
    took: 2 * 60 + 14,
    endTime: '16:54',
    watched: true,
    items: [
      thought('A sessão é a tela mais rica: o rastro, o campo, o trilho e quatro painéis. Começo lendo o código do eru.'),
      read([`/home/hermes/projects/eru/web/src/features/sessions/SessionPage.tsx`, `/home/hermes/projects/eru/web/src/features/transcript/Trail.tsx`]),
      step('Escreveu session.ts', 'edit', { touches: [file(`${SESSION_CWD}/src/prototypes/bernardo/eru/_components/data/session.ts`)], duration: 4 }),
      text('Os dados estão prontos. Agora o rastro, que é a parte com mais detalhe.'),
      step('Rodou um comando no terminal', 'terminal', { duration: 12 }),
    ],
  },
];

export interface Subagent {
  id: string;
  goal: string;
  status: TaskState;
  line: string;
  detail?: string;
  model: string;
  tools: number;
  steps: { key: string; label: string; icon: StepIcon }[];
  summary?: string;
  depth?: number;
}

export const SUBAGENTS: Subagent[] = [
  {
    id: 'sa-inicio',
    goal: 'Build the Início (home) screen of the Eru prototype with its states, and port the sky canvas',
    status: 'running',
    line: 'Rodando · há 12 min',
    detail: 'Rodando um comando no terminal',
    model: 'claude-opus-5-5',
    tools: 41,
    steps: [
      { key: 'a1', label: 'Leu HomePage.tsx', icon: 'read' },
      { key: 'a2', label: 'Leu 4 arquivos', icon: 'read' },
      { key: 'a3', label: 'Escreveu Início.tsx', icon: 'edit' },
      { key: 'a4', label: 'Rodou um comando no terminal', icon: 'terminal' },
    ],
  },
  {
    id: 'sa-sessao',
    goal: 'Build the Sessão (agent conversation) screens of the Eru prototype with their states and the side rail panels',
    status: 'running',
    line: 'Rodando · há 12 min',
    detail: 'Escrevendo Trail.tsx',
    model: 'claude-opus-5-5',
    tools: 58,
    steps: [
      { key: 'b1', label: 'Leu SessionPage.tsx', icon: 'read' },
      { key: 'b2', label: 'Leu Trail.tsx', icon: 'read' },
      { key: 'b3', label: 'Escreveu session.ts', icon: 'edit' },
    ],
  },
  {
    id: 'sa-projeto',
    goal: 'Build the project page (Projeto) of the Eru prototype: its five tabs and their states',
    status: 'completed',
    line: 'Terminou em 9 min 40 s',
    detail: 'As cinco abas do projeto, com vazio e erro. O quadro usa os cartões do Todoist do workspace.',
    model: 'claude-opus-5-5',
    tools: 37,
    steps: [
      { key: 'c1', label: 'Leu ProjectPage.tsx', icon: 'read' },
      { key: 'c2', label: 'Escreveu Visão geral.tsx', icon: 'edit' },
      { key: 'c3', label: 'Rodou um comando no terminal', icon: 'terminal' },
    ],
    summary: 'As cinco abas do projeto estão prontas: **Visão geral**, Rascunhos, Quadro, Notas e Caixa, cada uma com carregando, vazio e erro.',
  },
  {
    id: 'sa-areas',
    goal: 'Build the remaining areas: Sessões, Agendamentos, Memória, Arquivos, Perfis',
    status: 'failed',
    line: 'Falhou depois de 3 min 5 s',
    detail: 'O pnpm typecheck parou num erro em Memória.tsx.',
    model: 'claude-sonnet-5',
    tools: 12,
    steps: [
      { key: 'd1', label: 'Leu SessionsPage.tsx', icon: 'read' },
      { key: 'd2', label: 'Beco sem saída: o comando terminou com erro', icon: 'terminal' },
    ],
  },
];

export const OTHER_RUNNING = [{ id: 's-prototipos', title: 'Trazer protótipos do Design Studio para o Eru', projectId: 'eru', state: 'Respondendo · 2 subagentes rodando' }];

export interface FileNode {
  name: string;
  path: string;
  children?: FileNode[];
  content?: string;
  language?: string;
}

const node = (name: string, parent: string, children?: FileNode[], content?: string, language?: string): FileNode => ({ name, path: `${parent}/${name}`, children, content, language });

const PROTO = `${SESSION_CWD}/src/prototypes/bernardo/eru`;

export const APP_SHELL_SOURCE = `export default function AppShell({ current, bar, sky = 'calmo', rail, fill = false, children }: AppShellProps) {
  const [projectsOpen, setProjectsOpen] = useState(false);
  const area = current === 'nova-sessao' ? undefined : areaById(current);
  return (
    <div className="flex h-screen min-h-0 w-full overflow-hidden bg-sidebar text-foreground">
      <IconNav current={current} projectsOpen={projectsOpen} onToggleProjects={() => setProjectsOpen(open => !open)} />
      <main className="sky-card relative isolate my-2 mr-2 flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-h2">
        <Sky scene={sky} />
        <header className="relative z-[1] flex h-14 shrink-0 items-center gap-2 border-b border-h1 px-6">
          {bar ?? (area ? <PageTrail steps={[{ label: area.title }]} /> : null)}
        </header>
        <div className="relative z-[1] flex min-h-0 flex-1">
          {children}
          {rail}
        </div>
      </main>
    </div>
  );
}`;

export const FILE_TREE: FileNode[] = [
  node('.agents', SESSION_CWD, []),
  node('.github', SESSION_CWD, []),
  node('contributors', SESSION_CWD, []),
  node('public', SESSION_CWD, []),
  node('src', SESSION_CWD, [
    node('platform', `${SESSION_CWD}/src`, []),
    node('prototypes', `${SESSION_CWD}/src`, [
      node('bernardo', `${SESSION_CWD}/src/prototypes`, [
        node('eru', `${SESSION_CWD}/src/prototypes/bernardo`, [
          node('_components', PROTO, [
            node('shell', `${PROTO}/_components`, [node('AppShell.tsx', `${PROTO}/_components/shell`, undefined, APP_SHELL_SOURCE, 'tsx'), node('areas.ts', `${PROTO}/_components/shell`, undefined, "export const NEW_SESSION_TO = 'Sessão/Nova sessão';", 'ts')]),
            node('data', `${PROTO}/_components`, [node('workspace.ts', `${PROTO}/_components/data`, undefined, "export const PROFILE = { name: 'default', initial: 'D', user: 'Bernardo' };", 'ts')]),
          ]),
          node('Início', PROTO, []),
          node('Sessão', PROTO, []),
          node('meta.json', PROTO, undefined, '{\n  "formatVersion": 1,\n  "title": "Eru"\n}', 'json'),
        ]),
      ]),
    ]),
    node('systems', `${SESSION_CWD}/src`, [node('eru', `${SESSION_CWD}/src/systems`, [])]),
  ]),
  node('AGENTS.md', SESSION_CWD, undefined, '# Design Studio\n\nRead working context at the start of each session.', 'markdown'),
  node('CHANGELOG.md', SESSION_CWD, undefined, '# Changelog', 'markdown'),
  node('mise.toml', SESSION_CWD, undefined, '[tools]\nnode = "24"\npnpm = "10"', 'toml'),
  node('package.json', SESSION_CWD, undefined, '{\n  "name": "design-studio",\n  "private": true,\n  "type": "module"\n}', 'json'),
  node('pnpm-lock.yaml', SESSION_CWD),
  node('README.md', SESSION_CWD, undefined, '# Design Studio\n\nA local prototype sandbox.', 'markdown'),
  node('studio.config.json', SESSION_CWD, undefined, '{\n  "defaultSystem": "product"\n}', 'json'),
  node('vite.config.ts', SESSION_CWD, undefined, "import { defineConfig } from 'vite';\n\nexport default defineConfig({});", 'ts'),
];

export const TERMINAL_LINES: { text: string; tone?: 'prompt' | 'path' | 'ok' | 'dim' | 'warn' }[][] = [
  [{ text: 'hermes@hermesagent', tone: 'prompt' }, { text: ':' }, { text: '~/projects/endless-harness', tone: 'path' }, { text: '$ pnpm studio identify src/prototypes/bernardo/eru --yes' }],
  [{ text: 'Assigned 14 studio ids.', tone: 'ok' }],
  [{ text: 'hermes@hermesagent', tone: 'prompt' }, { text: ':' }, { text: '~/projects/endless-harness', tone: 'path' }, { text: '$ pnpm typecheck' }],
  [{ text: '> design-studio@0.18.0 typecheck', tone: 'dim' }],
  [{ text: '> tsc -b --noEmit', tone: 'dim' }],
  [{ text: '' }],
  [{ text: 'hermes@hermesagent', tone: 'prompt' }, { text: ':' }, { text: '~/projects/endless-harness', tone: 'path' }, { text: '$ git status --short' }],
  [{ text: ' M src/prototypes/bernardo/eru/Sessão/Sessão.tsx', tone: 'warn' }],
  [{ text: '?? src/prototypes/bernardo/eru/_components/session/', tone: 'warn' }],
  [{ text: 'hermes@hermesagent', tone: 'prompt' }, { text: ':' }, { text: '~/projects/endless-harness', tone: 'path' }, { text: '$ ' }],
];

export const BROWSER_TABS = [
  { id: 'aba-studio', title: 'Eru · Design Studio', url: 'http://192.168.68.102:5180/prototypes/wa5xjb3thtrw3cvr' },
  { id: 'aba-eru', title: 'eru', url: 'http://192.168.68.102:9120/sessoes/20261016_145615_492dd7' },
];
