// The default profile's cron jobs, as the Agendamentos pages show them, with the runs of each. Schedule texts are written
// as eru's cronstrue (pt-BR) renders them; times are relative to Friday, 16 October 2026, 15:40.
export type JobState = 'scheduled' | 'running' | 'paused' | 'disabled' | 'completed' | 'error';

export interface CronRun {
  id: string;
  when: string;
  /** Concluída, Sem resposta final, Não terminou, Em andamento; script runs have their own status. */
  outcome: { label: string | null; tone: Tone; text: string | null; hasReply: boolean };
  duration: string | null;
  reply?: string;
}

export interface CronJob {
  id: string;
  name: string;
  prompt: string;
  scheduleText: string;
  source: string;
  state: JobState;
  next: { text: string; overdue?: boolean } | null;
  lastRun: string | null;
  lastFailed?: boolean;
  lastError?: string;
  deliver: string;
  model?: string;
  skills?: string[];
  script?: string;
  runs: CronRun[];
}

export type Tone = 'ok' | 'atencao' | 'falha' | 'neutro';

export const TONE_VARIANT = { ok: 'default', atencao: 'secondary', falha: 'destructive', neutro: 'outline' } as const;

const STATES: Record<JobState, { label: string; tone: Tone }> = {
  scheduled: { label: 'Ativo', tone: 'ok' },
  running: { label: 'Rodando agora', tone: 'ok' },
  paused: { label: 'Pausado', tone: 'atencao' },
  disabled: { label: 'Desativado', tone: 'atencao' },
  completed: { label: 'Concluído', tone: 'neutro' },
  error: { label: 'Com erro', tone: 'falha' },
};

export const stateInfo = (job: Pick<CronJob, 'state'>) => STATES[job.state];

export const isPaused = (job: Pick<CronJob, 'state'>) => job.state === 'paused' || job.state === 'disabled';

const done = (id: string, when: string, duration: string, reply: string): CronRun => ({ id, when, outcome: { label: 'Concluída', tone: 'ok', text: null, hasReply: true }, duration, reply });

const BANCO_PROMPT = `Automações pessoais de Bernardo devem notificar em pt-BR. Tarefa diária: sincronizar incrementos financeiros via Banco MCP/Open Finance e entregar relatório Markdown na ingestion do ambiente pessoal.

Estrutura atual dos vaults:
- Raiz local: \`/home/hermes/Vaults\` (\`~/Vaults\`; docs podem dizer \`C:/Vaults\`).
- Ambiente pessoal: \`/home/hermes/Vaults/Personal/\`.
- Vault pessoal real: \`/home/hermes/Vaults/Personal/Vault - Personal/\`.
- Ingestion pessoal fora do vault: \`/home/hermes/Vaults/Personal/ingestion/\`.
- NÃO grave relatórios financeiros no ambiente Endless Access.
- Leia \`/home/hermes/Vaults/AGENTS.md\`, \`/home/hermes/Vaults/Personal/AGENTS.md\` e o guia do vault pessoal antes de modificar notas. O job deve preferir escrever apenas na ingestion; o pipeline de ingestão decide destino dentro do vault.`;

export const JOBS: CronJob[] = [
  {
    id: '6bf7cc21258b',
    name: 'Atualização do Dashboard Financeiro',
    prompt: 'Atualize o dashboard financeiro pessoal com os lançamentos novos da ingestion e avise no Slack se alguma categoria passar do orçamento do mês.',
    scheduleText: 'Todo dia às 06:37 e 18:37',
    source: '37 6,18 * * *',
    state: 'scheduled',
    next: { text: 'sex., 16 de out., 18:37' },
    lastRun: '16 de out. de 2026, 06:37',
    deliver: 'local',
    model: 'anthropic · claude-opus-5-5',
    runs: [
      done('r1', '16 de out. de 2026, 06:37', '1 min', 'Dashboard atualizado com **14 lançamentos** novos. Nenhuma categoria passou do orçamento de outubro.'),
      done('r2', '15 de out. de 2026, 18:37', '2 min', 'Dashboard atualizado com **3 lançamentos** novos. Mercado está em 82% do orçamento.'),
    ],
  },
  {
    id: '084b2c0de8b5',
    name: 'Todoist → Kanban (Endless Access)',
    prompt: 'Sincronize as tarefas do projeto Endless Access no Todoist com o quadro Kanban do Hermes: crie cards para tarefas novas e feche os cards de tarefas concluídas.',
    scheduleText: 'Na hora certa, a cada 2 horas, entre 09:00 e 19:00',
    source: '0 9-19/2 * * *',
    state: 'scheduled',
    next: { text: 'sex., 16 de out., 19:00' },
    lastRun: '16 de out. de 2026, 15:00',
    deliver: 'local',
    model: 'anthropic · claude-opus-5-5',
    skills: ['todoist', 'kanban-coordination'],
    runs: [done('r1', '16 de out. de 2026, 15:00', '48 s', 'Dois cards novos: *Sketch permissions matrix across roles* e *Review role icons export*. Nenhum card fechado.')],
  },
  {
    id: 'b215522346b0',
    name: 'Banco MCP Finance Sync para Personal Ingestion',
    prompt: BANCO_PROMPT,
    scheduleText: 'Todo dia às 00:30',
    source: '30 0 * * *',
    state: 'scheduled',
    next: { text: 'sáb., 17 de out., 00:30' },
    lastRun: '16 de out. de 2026, 00:30',
    lastFailed: true,
    lastError: `RuntimeError: HTTP 400: {"detail":"The 'gpt-5.5' model is not supported when using Codex with a ChatGPT account."}`,
    deliver: 'local',
    model: 'openai-codex · gpt-5.5',
    skills: ['remote-mcp-client-workflows', 'okf-vault', 'hermes-cron-automations', 'hermes-agent'],
    runs: [
      { id: 'r1', when: '16 de out. de 2026, 00:30', outcome: { label: 'Sem resposta final', tone: 'falha', text: 'O agente terminou sem uma resposta final.', hasReply: true }, duration: '4 s', reply: '' },
      done('r2', '15 de out. de 2026, 00:30', '3 min', 'Relatório salvo em `~/Vaults/Personal/ingestion/financas-2026-10-15.md`.\n\n- 9 transações novas em 2 contas\n- Saldo consolidado atualizado\n- Nenhuma cobrança duplicada'),
      done('r3', '14 de out. de 2026, 00:30', '2 min', 'Relatório salvo em `~/Vaults/Personal/ingestion/financas-2026-10-14.md`. 4 transações novas.'),
    ],
  },
  {
    id: 'd304ae31b50f',
    name: 'BC Design Monthly Invoice Delivery',
    prompt: 'No dia 1, gere a invoice mensal da BC Design a partir do modelo em ~/Vaults e envie para o cliente por e-mail; nos outros dias, só confira se há pendência.',
    scheduleText: 'Todo dia às 12:00',
    source: '0 12 * * *',
    state: 'scheduled',
    next: { text: 'sáb., 17 de out., 12:00' },
    lastRun: '16 de out. de 2026, 12:00',
    deliver: 'local',
    model: 'anthropic · claude-opus-5-5',
    runs: [done('r1', '16 de out. de 2026, 12:00', '35 s', 'Nenhuma pendência hoje. A próxima invoice sai em 1 de novembro.')],
  },
  {
    id: '901d49481b65',
    name: 'LLM Wiki Intake e Higienização',
    prompt: 'Processe o intake da LLM Wiki pessoal: leia SCHEMA.md, integre as fontes novas, atualize índices e o log, e remova duplicatas.',
    scheduleText: 'Às 03:00, somente de domingo',
    source: '0 3 * * 0',
    state: 'scheduled',
    next: { text: 'dom., 18 de out., 03:00' },
    lastRun: '11 de out. de 2026, 03:00',
    deliver: 'local',
    model: 'openai-codex · gpt-5.5',
    runs: [done('r1', '11 de out. de 2026, 03:00', '12 min', '7 fontes integradas, 2 sínteses atualizadas e o índice refeito.')],
  },
  {
    id: '14863ed6c05d',
    name: 'Watchdog Gmail para Vault OKF',
    prompt: 'Leia os e-mails novos marcados como OKF e registre os relevantes no vault certo.',
    scheduleText: 'Todo dia às 12:00',
    source: '0 12 * * *',
    state: 'paused',
    next: null,
    lastRun: '2 de out. de 2026, 12:00',
    deliver: 'local',
    runs: [],
  },
  {
    id: '45a590646d55',
    name: 'Husky CNPJ WhatsApp para contadora',
    prompt: 'Envie para a contadora, pelo WhatsApp, o resumo do mês do CNPJ com as notas emitidas.',
    scheduleText: 'Todo dia às 12:30',
    source: '30 12 * * *',
    state: 'paused',
    next: null,
    lastRun: '30 de set. de 2026, 12:30',
    lastFailed: true,
    lastError: 'WhatsApp: home channel not configured (WHATSAPP_HOME_CHANNEL).',
    deliver: 'whatsapp',
    runs: [],
  },
  {
    id: '0541df1e6f04',
    name: 'Harness: Studio usage counts',
    prompt: '',
    scheduleText: 'Todo dia às 07:00',
    source: '0 7 * * *',
    script: 'scripts/studio_usage.py',
    state: 'paused',
    next: null,
    lastRun: '1 de out. de 2026, 07:00',
    deliver: 'local',
    runs: [{ id: 'r1', when: '1 de out. de 2026, 07:00', outcome: { label: 'Concluída', tone: 'ok', text: '214 eventos contados em 12 sessões.', hasReply: false }, duration: null }],
  },
];

export const jobById = (id: string) => JOBS.find(job => job.id === id)!;

export const DELIVERY_TARGETS = [
  { id: 'local', label: 'Local (só salva o resultado)', home: true },
  { id: 'bot-chat-default', label: 'bot-chat (default)', home: true },
  { id: 'bot-chat-coder', label: 'bot-chat (coder)', home: true },
  { id: 'bot-chat-llmwiki', label: 'bot-chat (llmwiki)', home: true },
  { id: 'bot-chat-mechanic', label: 'bot-chat (mechanic)', home: true },
  { id: 'bot-chat-watchdog', label: 'bot-chat (watchdog)', home: true },
];

export const SCHEDULE_FORMATS = 'cinco campos (min hora dia mês semana, ex. 0 9 * * *), intervalo (every 30m) ou data (2026-10-06T09:00)';

export const PRESETS = [
  { label: 'Todo dia às 9h', value: '0 9 * * *' },
  { label: 'Dias úteis às 9h', value: '0 9 * * 1-5' },
  { label: 'Toda segunda às 9h', value: '0 9 * * 1' },
  { label: 'A cada hora', value: '0 * * * *' },
  { label: 'A cada 30 minutos', value: 'every 30m' },
];

const KNOWN: Record<string, string> = {
  '0 9 * * *': 'Todo dia às 09:00',
  '0 9 * * 1-5': 'Às 09:00, de segunda-feira a sexta-feira',
  '0 9 * * 1': 'Às 09:00, somente de segunda-feira',
  '0 * * * *': 'A cada hora',
  '30 0 * * *': 'Todo dia às 00:30',
  '0 12 * * *': 'Todo dia às 12:00',
};

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

/** What the schedule field means, under it: the cron text for the presets and simple daily times, intervals, dates. */
export function schedulePreview(input: string) {
  const value = input.trim();
  const interval = /^(?:every\s+)?(\d+)\s*(m|h|d)$/i.exec(value);
  if (interval) {
    const minutes = Number(interval[1]) * { m: 1, h: 60, d: 1440 }[interval[2].toLowerCase() as 'm' | 'h' | 'd'];
    if (minutes <= 0) return null;
    if (minutes % 1440 === 0) return `A cada ${plural(minutes / 1440, 'dia', 'dias')}`;
    if (minutes % 60 === 0) return `A cada ${plural(minutes / 60, 'hora', 'horas')}`;
    return `A cada ${plural(minutes, 'minuto', 'minutos')}`;
  }
  if (KNOWN[value]) return KNOWN[value];
  const daily = /^(\d{1,2}) (\d{1,2}) \* \* \*$/.exec(value);
  if (daily && Number(daily[1]) < 60 && Number(daily[2]) < 24) return `Todo dia às ${daily[2].padStart(2, '0')}:${daily[1].padStart(2, '0')}`;
  const date = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (date) {
    const months = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];
    return `Uma vez, em ${Number(date[3])} de ${months[Number(date[2]) - 1] ?? ''} de ${date[1]}, ${date[4]}:${date[5]}`;
  }
  return null;
}
