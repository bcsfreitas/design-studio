// Sample data of a project's page: the Eru project as it is today (its board, drafts, notes, inbox, servers and older
// sessions) and a brand new project with nothing yet. Sessions of the last hours come from workspace.ts.
import { projectById, sessionsOf, type Project, type Session } from './workspace';

export type ProjectTabId = 'visao-geral' | 'rascunhos' | 'quadro' | 'notas' | 'caixa';

export const PROJECT_TABS: readonly { id: ProjectTabId; label: string; to: string }[] = [
  { id: 'visao-geral', label: 'Visão geral', to: 'Projeto/Visão geral' },
  { id: 'rascunhos', label: 'Rascunhos', to: 'Projeto/Rascunhos' },
  { id: 'quadro', label: 'Quadro', to: 'Projeto/Quadro' },
  { id: 'notas', label: 'Notas', to: 'Projeto/Notas' },
  { id: 'caixa', label: 'Caixa', to: 'Projeto/Caixa' },
];

export type EstadoHermes = 'triage' | 'todo' | 'scheduled' | 'ready' | 'running' | 'blocked' | 'review' | 'done';

export type ColunaId = 'a-especificar' | 'a-fazer' | 'trabalhando' | 'esperando' | 'feito';

export type CardAcao = 'pronto' | 'mandar' | 'responder' | 'aprovar' | 'pedir-mudancas' | 'arquivar';

export interface CardExecucao {
  id: string;
  desfecho: string;
  perfil: string;
  quando: string;
  duracao: string | null;
  resumo?: string;
}

export interface CardComentario {
  id: string;
  autor: string;
  quando: string;
  texto: string;
}

export interface QuadroCard {
  id: string;
  titulo: string;
  estado: EstadoHermes;
  responsavel: string | null;
  comVoce?: boolean;
  /** The issue file number, as the card shows it in the corner ("44"). */
  issue?: string;
  descricao?: string;
  pergunta?: string;
  execucoes?: CardExecucao[];
  comentarios?: CardComentario[];
}

export type Rastreador = { tipo: 'local' } | { tipo: 'github'; repositorio: string } | { tipo: 'nenhum' };

export interface Quadro {
  rastreador: Rastreador;
  responsavel: string;
  perfis: string[];
  cards: QuadroCard[];
}

export const COLUNAS: readonly { id: ColunaId; label: string }[] = [
  { id: 'a-especificar', label: 'A especificar' },
  { id: 'a-fazer', label: 'A fazer' },
  { id: 'trabalhando', label: 'Trabalhando' },
  { id: 'esperando', label: 'Esperando você' },
  { id: 'feito', label: 'Feito' },
];

export const ESTADO_LABEL: Record<EstadoHermes, string> = {
  triage: 'em triagem',
  todo: 'esperando outro card',
  scheduled: 'agendado',
  ready: 'pronto',
  running: 'rodando',
  blocked: 'bloqueado',
  review: 'em revisão',
  done: 'concluído',
};

export const COLUNA_DO_ESTADO: Record<EstadoHermes, ColunaId> = {
  triage: 'a-especificar',
  todo: 'a-fazer',
  scheduled: 'a-fazer',
  ready: 'a-fazer',
  running: 'trabalhando',
  blocked: 'esperando',
  review: 'esperando',
  done: 'feito',
};

/** The actions each state allows, as the plugin sends them; Mandar does not show on a ready card with an assignee. */
export function acoesDo(card: QuadroCard): CardAcao[] {
  const acoes: Record<EstadoHermes, CardAcao[]> = {
    triage: ['pronto', 'arquivar'],
    todo: ['mandar', 'arquivar'],
    scheduled: ['mandar', 'arquivar'],
    ready: ['mandar', 'arquivar'],
    running: [],
    blocked: ['responder', 'arquivar'],
    review: ['aprovar', 'pedir-mudancas', 'arquivar'],
    done: ['arquivar'],
  };
  return acoes[card.estado].filter(acao => !(acao === 'mandar' && ((card.estado === 'ready' && card.responsavel) || card.comVoce)));
}

export type Desfecho = 'explorando' | 'escolhido' | 'descartado';

/** A mock screenshot: the palette of the page it shows. */
export type ShotLook = 'claro' | 'escuro' | 'faixas' | 'orbita' | 'noite' | 'serif' | 'lista' | 'verde';

export interface Rascunho {
  id: string;
  tipo: string;
  nome: string;
  dia: string;
  ficha: boolean;
  desfecho: Desfecho | null;
  branch?: string;
  capa?: ShotLook;
  shots: ShotLook[];
  /** Shots beyond the ones drawn, for the "+N" of a draft without a sheet. */
  maisShots?: number;
}

export interface Nota {
  nome: string;
  titulo: string;
  editada: string;
  tamanho: string;
  texto: string;
}

export type Previa = 'imagem' | 'texto' | 'pdf' | 'pagina' | 'nenhuma';

export interface CaixaItem {
  caminho: string;
  nome: string;
  pasta?: boolean;
  previa?: Previa;
  tamanho?: string;
  modificado?: string;
  /** The colours of an image's thumbnail, drawn as a gradient. */
  cores?: [string, string];
  texto?: string;
}

export interface DevServer {
  porta: number;
  comando: string;
  onde: string | null;
  url: string | null;
}

export interface PullRequest {
  numero: number;
  titulo: string;
  estado: 'open' | 'draft' | 'merged' | 'closed';
  checks: { nome: string; estado: 'passou' | 'falhou' | 'rodando' | 'pulou' }[];
}

export interface ProjectData {
  project: Project;
  folder: string;
  /** The branch, or null outside a git repository. */
  branch: string | null;
  pr: PullRequest | null;
  /** The project's sessions, newest first; the ones with a live turn or a question show in Em andamento. */
  sessions: Session[];
  quadro: Quadro;
  rascunhos: Rascunho[];
  notas: Nota[];
  caixa: CaixaItem[];
  servers: DevServer[];
  /** The engineering skills summary line, or null when not configured. */
  skills: string | null;
}

const ERU = projectById('eru')!;

const older = (id: string, title: string, preview: string, minutesAgo: number, messages = 20): Session => ({
  id,
  title,
  preview,
  projectId: 'eru',
  minutesAgo,
  messages,
  model: 'Claude Opus 5.5',
});

export const ERU_OLDER_SESSIONS: Session[] = [
  older('s-matt-2', 'Set up Matt Pocock skills #2', 'O eru já está configurado, e a configuração atual cobre tudo o que os modelos da skill pedem. Não mudei nada.', 110),
  older('s-canvas-svg', 'Exportar canvas do fundo da home em SVG', 'Gerei a versão limpa, só com o padrão: ~/projects/eru/.scratch/exportes/padrao-astrolabio.svg (136 KB).', 140),
  older('s-canvas-janelas', 'Reposicionar canvas nas janelas de sessões', 'Montei os 6 exemplos sobre uma sessão real do eru, em Tarde e Noite. A tela foi capturada sem o céu.', 150),
  older('s-matt-1', 'Set up Matt Pocock skills', 'O eru agora guarda as issues como arquivos Markdown na própria pasta do projeto, em .scratch/<feature>/issues.', 60 * 26),
  older('s-quadro-gaveta', 'Gaveta do card no Quadro', 'A gaveta abre o card sem sair da aba, com as ações que valem no estado dele.', 60 * 30),
  older('s-caixa', 'Caixa: soltar arquivos em qualquer ponto da aba', 'O véu cobre o cartão enquanto você arrasta; soltar envia para a pasta aberta.', 60 * 48),
  older('s-notas', 'Notas com salvamento automático', 'A nota salva 800 ms depois da última tecla e renomeia o arquivo quando o título muda.', 60 * 50),
  older('s-selos', 'Catálogo de selos dos projetos', 'São 30 selos em seis famílias; o seletor mostra a família e o nome de cada um.', 60 * 72),
  older('s-turnos', 'Erro do turno que diz o que falhou', 'O cartão de erro agora diz o que falhou e o que fazer, com os detalhes técnicos fechados.', 60 * 96),
  older('s-perfis', 'Avatar dos perfis no seletor', 'O avatar usa a inicial do perfil sobre o selo, com a cor de destaque quando ativo.', 60 * 120),
];

const bloqueado = (id: string, titulo: string, issue?: string, pergunta?: string): QuadroCard => ({ id, titulo, estado: 'blocked', responsavel: 'coder', issue, pergunta });

export const ERU_QUADRO: Quadro = {
  rastreador: { tipo: 'local' },
  responsavel: 'coder',
  perfis: ['coder', 'mechanic', 'default'],
  cards: [
    { id: 'c-seguranca', titulo: 'Implementar seção Segurança (auditoria) em /sistema via rota do plugin', estado: 'todo', responsavel: 'coder' },
    { id: 'c-doctor', titulo: 'Implementar seções Diagnóstico (doctor) e Curador de skills em /sistema', estado: 'todo', responsavel: 'coder' },
    { id: 'c-manutencao', titulo: 'Manutenção: diagnóstico, segurança e curador em linguagem simples', estado: 'todo', responsavel: 'default', issue: '44' },
    { id: 'c-avatar', titulo: 'Testar manualmente avatar, Conversar e Rotinas contra o dashboard real', estado: 'todo', responsavel: 'coder' },
    { id: 'c-conversar', titulo: "Adicionar botão 'Conversar' que troca o perfil e retoma o Bot Chat", estado: 'todo', responsavel: 'coder' },
    { id: 'c-profile-avatar', titulo: 'Criar ProfileAvatar e exibi-lo em ProfilesPage, ProfileDetailPage e ProfileSelect', estado: 'ready', responsavel: 'coder' },
    {
      id: 'c-oauth',
      titulo: 'Verificar se o OAuth de MCP funciona do navegador com o dashboard remoto',
      estado: 'running',
      responsavel: 'mechanic',
      descricao: 'Abrir o fluxo de OAuth de um servidor MCP a partir do eru servido pela rede de casa e confirmar que o retorno chega ao dashboard.',
      execucoes: [{ id: 'run_7f3a2c', desfecho: 'Está trabalhando', perfil: 'mechanic', quando: 'começou há 12 min', duracao: null }],
    },
    bloqueado('c-sistema', "Criar a área /sistema (Sistema) no grupo 'mais' e em Ajustes e conta", undefined, 'A área Sistema entra no grupo “mais” da coluna de ícones ou só em Ajustes e conta? Os dois lugares mostram a mesma coisa.'),
    bloqueado('c-profiles-list', 'Consultar profiles.list e profiles.get_asset pelo gateway, com fake-hermes'),
    bloqueado('c-todos-perfis', "Implementar 'Todos os perfis' na página Agendamentos do eru"),
    bloqueado('c-skills', 'Página /perfis/$nome/skills: listar, ligar/desligar e ver skills do perfil', '41'),
    bloqueado('c-navegador', 'UI do painel Navegador: modo Comentar, pinos e envio para a conversa'),
    bloqueado('c-inspect', 'Plugin navegador.py: ação inspect, métodos DOM/CSS, redação e emenda da ADR 0004'),
    bloqueado('c-sudo', 'Cartão sigiloso para pedidos `sudo` e `secret` com campo mascarado no eru'),
    bloqueado('c-resume', 'session.resume pede o histórico inteiro e o eru o descarta'),
    bloqueado('c-cgroup', 'Investigar efeito do restart/update do gateway no cgroup e reconexão'),
    bloqueado('c-ship', 'Recomendar se trazemos o fluxo de ship para o eru e definir o primeiro corte'),
    {
      id: 'c-gaveta',
      titulo: 'Gaveta do card: ações por estado e histórico de execuções',
      estado: 'review',
      responsavel: 'coder',
      issue: '38',
      descricao: 'A gaveta mostra as ações que valem no estado do card e o que o agente fez em cada execução.',
      execucoes: [
        {
          id: 'run_5b81e0',
          desfecho: 'Terminou',
          perfil: 'coder',
          quando: 'ontem às 17:40',
          duracao: '24 min',
          resumo: 'A gaveta abre o card sem sair da aba. Os testes de card.test.tsx passam e o typecheck está limpo.',
        },
      ],
      comentarios: [{ id: 'cm-1', autor: 'coder', quando: 'há 20 h', texto: 'Pronto para revisão. Deixei Arquivar no pé da gaveta, com a confirmação ali mesmo.' }],
    },
    { id: 'c-reinicio', titulo: 'Dashboard do Hermes (9119) em loop de reinício: um dashboard de teste na 9399 se diz dono do host', estado: 'done', responsavel: 'mechanic' },
    { id: 'c-rota-auditoria', titulo: 'Adicionar rota do plugin POST /api/plugins/eru/manutencao/auditoria', estado: 'done', responsavel: 'coder' },
    { id: 'c-rotinas', titulo: "Adicionar seção 'Rotinas' no detalhe do perfil, reaproveitando cron.ts", estado: 'done', responsavel: 'coder' },
    { id: 'c-9119', titulo: 'Fazer o dashboard 9119 responder e confirmar GET /api/cron/jobs?profile=all', estado: 'done', responsavel: 'mechanic' },
    { id: 'c-slack', titulo: 'Desligar Slack e WhatsApp sem credencial no config.yaml do perfil default', estado: 'done', responsavel: 'mechanic' },
  ],
};

export const ERU_RASCUNHOS: Rascunho[] = [
  { id: 'r-prototipos', tipo: 'sketches', nome: 'prototipos', dia: 'Hoje', ficha: false, desfecho: null, shots: ['claro', 'lista', 'escuro', 'claro'], maisShots: 19 },
  { id: 'r-fundo-vivo', tipo: 'sketches', nome: 'fundo-vivo-lugar', dia: 'Hoje', ficha: true, desfecho: 'explorando', capa: 'faixas', shots: [] },
  { id: 'r-mapa', tipo: 'sketches', nome: 'mapa-estelar', dia: 'Ontem', ficha: true, desfecho: 'explorando', capa: 'escuro', shots: [] },
  { id: 'r-radial', tipo: 'sketches', nome: 'radial-2d', dia: 'Ontem', ficha: true, desfecho: 'explorando', branch: 'radial-2d', capa: 'orbita', shots: [] },
  { id: 'r-chama', tipo: 'sketches', nome: 'chama-imperecivel', dia: '14 de outubro', ficha: true, desfecho: 'descartado', capa: 'noite', shots: [] },
  { id: 'r-menel', tipo: 'sketches', nome: 'menel-hoje', dia: '13 de outubro', ficha: true, desfecho: 'explorando', capa: 'serif', shots: [] },
  { id: 'r-tirion', tipo: 'sketches', nome: 'sessao-tirion', dia: '13 de outubro', ficha: true, desfecho: 'escolhido', capa: 'lista', shots: [] },
  { id: 'r-mistura', tipo: 'sketches', nome: 'sessao-mistura', dia: '12 de outubro', ficha: false, desfecho: null, shots: ['verde', 'verde', 'noite', 'verde'], maisShots: 32 },
  { id: 'r-telperion', tipo: 'sketches', nome: 'sessao-telperion', dia: '12 de outubro', ficha: false, desfecho: null, shots: ['escuro', 'faixas'] },
  { id: 'r-onboarding', tipo: 'prototypes', nome: 'primeira-sessao', dia: '9 de outubro', ficha: true, desfecho: 'escolhido', branch: 'onboarding', capa: 'claro', shots: [] },
];

export const ERU_NOTAS: Nota[] = [
  {
    nome: 'ideias-para-o-quadro.md',
    titulo: 'Ideias para o Quadro',
    editada: 'Hoje, 11:42',
    tamanho: '1,2 KB',
    texto:
      '# Ideias para o Quadro\n\n- Arrastar um card entre colunas só onde a ação existe (A fazer → Trabalhando é “Mandar para o agente”).\n- Mostrar no card quanto tempo ele está esperando você.\n- Um filtro por responsável no topo, ao lado de “Responsável”.\n\n## Perguntas\n\nO card bloqueado deveria abrir já com o campo de resposta focado?\n',
  },
  {
    nome: 'paleta-do-crepusculo.md',
    titulo: 'Paleta do crepúsculo',
    editada: 'Ontem, 18:05',
    tamanho: '640 B',
    texto: '# Paleta do crepúsculo\n\nEntre o claro e o escuro: o fundo vira malva, a tinta fica em 85% e o ouro esquenta um pouco.\n\n- página: #4a3f45\n- tinta: #efe7e4\n- ouro: #f0a35e\n',
  },
  {
    nome: 'checklist-de-release.md',
    titulo: 'Checklist de release',
    editada: '12 de outubro',
    tamanho: '2,3 KB',
    texto: '# Checklist de release\n\n1. pnpm typecheck e pnpm test\n2. Subir o plugin e reiniciar o dashboard\n3. Abrir o eru pelo Tailscale e conferir a Visão geral de dois projetos\n',
  },
];

export const ERU_CAIXA: CaixaItem[] = [
  { caminho: 'refs', nome: 'refs', pasta: true },
  { caminho: 'refs/marca', nome: 'marca', pasta: true },
  { caminho: 'refs/marca/selo-gota.png', nome: 'selo-gota.png', previa: 'imagem', tamanho: '24 KB', modificado: '11 de outubro', cores: ['#2a2420', '#e3a35e'] },
  { caminho: 'refs/paleta-tirion.png', nome: 'paleta-tirion.png', previa: 'imagem', tamanho: '312 KB', modificado: '12 de outubro', cores: ['#1d2a22', '#b9c7a0'] },
  { caminho: 'refs/telperion.html', nome: 'telperion.html', previa: 'pagina', tamanho: '18 KB', modificado: '12 de outubro' },
  { caminho: 'ryan-demita-ttk-demita14.jpg', nome: 'ryan-demita-ttk-demita14.jpg', previa: 'imagem', tamanho: '1001 KB', modificado: '14 de outubro', cores: ['#5b2a26', '#c99a74'] },
  { caminho: 'ryan-klaverweide-f1ef7360073341-5bce77a53adc9.jpg', nome: 'ryan-klaverweide-f1ef7360073341-5bce77a53adc9.jpg', previa: 'imagem', tamanho: '466 KB', modificado: '14 de outubro', cores: ['#2b2f6b', '#d9a35b'] },
  { caminho: 'david-castillo-destiny2-titlescreen-uw.webp', nome: 'david-castillo-destiny2-titlescreen-uw.webp', previa: 'imagem', tamanho: '87 KB', modificado: '14 de outubro', cores: ['#14161c', '#e7b45a'] },
  { caminho: 'lyndon-willoughby-art-blast-renegades.webp', nome: 'lyndon-willoughby-art-blast-renegades.webp', previa: 'imagem', tamanho: '82 KB', modificado: '14 de outubro', cores: ['#3a1416', '#b8433a'] },
  { caminho: 'joseph-biwald-d2-evergreen-starmaps-light-d2-crops-offset-jb-3840x2160.jpg', nome: 'joseph-biwald-d2-evergreen-starmaps-light-d2-crops-offset-jb-3840x2160.jpg', previa: 'imagem', tamanho: '1,4 MB', modificado: '14 de outubro', cores: ['#3d3a33', '#c6b48a'] },
  { caminho: 'joseph-biwald-biwald-radial-01-osiris-full.jpg', nome: 'joseph-biwald-biwald-radial-01-osiris-full.jpg', previa: 'imagem', tamanho: '1,2 MB', modificado: '14 de outubro', cores: ['#121316', '#5d6068'] },
  { caminho: 'joseph-biwald-biwald-radial-02-warmind-full.jpg', nome: 'joseph-biwald-biwald-radial-02-warmind-full.jpg', previa: 'imagem', tamanho: '886 KB', modificado: '14 de outubro', cores: ['#17181b', '#4d5057'] },
  { caminho: 'notas-da-call-com-a-ana.md', nome: 'notas-da-call-com-a-ana.md', previa: 'texto', tamanho: '3 KB', modificado: 'Ontem, 16:20', texto: '# Call com a Ana\n\n- O Quadro precisa mostrar quem está esperando quem.\n- A Caixa vira o lugar das referências de cada projeto.\n' },
  { caminho: 'adr-0004-navegador.pdf', nome: 'adr-0004-navegador.pdf', previa: 'pdf', tamanho: '212 KB', modificado: '13 de outubro' },
];

export const ERU_SERVERS: DevServer[] = [
  { porta: 4195, comando: '/usr/bin/python3 -m http.server 4195 --bind 0.0.0.0', onde: '.scratch/sketches/', url: 'http://192.168.68.102:4195' },
  { porta: 4196, comando: '~/.local/bin/caddy run --config ~/projects/eru/.scratch/sketches/prototipos/serve/Caddyfile', onde: null, url: 'http://192.168.68.102:4196' },
];

export const ERU_PROJECT: ProjectData = {
  project: ERU,
  folder: '/home/hermes/projects/eru',
  branch: 'main',
  pr: null,
  sessions: [...sessionsOf('eru'), ...ERU_OLDER_SESSIONS].sort((a, b) => a.minutesAgo - b.minutesAgo),
  quadro: ERU_QUADRO,
  rascunhos: ERU_RASCUNHOS,
  notas: ERU_NOTAS,
  caixa: ERU_CAIXA,
  servers: ERU_SERVERS,
  skills: 'Issues em arquivos dentro do projeto · rótulos padrão · um contexto',
};

/** Eru on a feature branch with its pull request open and the checks still running. */
export const ERU_ON_BRANCH: ProjectData = {
  ...ERU_PROJECT,
  branch: 'quadro-gaveta',
  pr: {
    numero: 128,
    titulo: 'Gaveta do card: ações por estado e histórico de execuções',
    estado: 'open',
    checks: [
      { nome: 'typecheck', estado: 'passou' },
      { nome: 'lint', estado: 'passou' },
      { nome: 'test', estado: 'rodando' },
      { nome: 'build', estado: 'passou' },
    ],
  },
};

/** A project just created: a git repository with nothing in it yet and no place for the issues. */
export const NEW_PROJECT: ProjectData = {
  project: { id: 'atlas', label: 'Atlas', path: '~/projects/atlas', seal: 'hexagono', branch: 'main' },
  folder: '/home/hermes/projects/atlas',
  branch: 'main',
  pr: null,
  sessions: [],
  quadro: { rastreador: { tipo: 'nenhum' }, responsavel: 'coder', perfis: ['coder', 'mechanic', 'default'], cards: [] },
  rascunhos: [],
  notas: [],
  caixa: [],
  servers: [],
  skills: null,
};
