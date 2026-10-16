// The default profile's memory: the external provider and the entries of MEMORY.md and USER.md (split on "§").
export const MEMORY_PROVIDER = {
  name: 'honcho',
  description: 'Honcho AI-native memory — cross-session user modeling with dialectic Q&A, semantic search, and persistent conclusions.',
  configured: true,
  status: 'Pronto para uso.',
};

export const AGENT_MEMORY = [
  'Vaults (24/09): raiz `~/Vaults/`. Pessoal `Vault - Personal/` (LLM Wiki pt-BR; ler SCHEMA.md, index.md, log.md; toda mudança entra em log.md). Trabalho `Vault - Endless Access/` (inglês; ler AGENTS.md/index.md/SPEC.md/log.md). `~/Vaults/Personal/` é só workspace (ingestion/), não vault.',
  'Invoice BC Design: antes de alterar o cron, achar scripts em `~/Vaults` e registrar no vault certo.',
  'Banco/OpenFinance: cron b215522346b0 (00:30) → ~/Vaults/Personal/ingestion/ + Slack.',
  'Perfis Hermes (05/10): default, `llmwiki`, `coder` (só código; cwd ~/projects; TODA task de código do Kanban vai p/ coder), `watchdog` (syncs + sweep de tarefas; crons b469fa466a12, 7a42934e12f5), `mechanic` (infra; update 05h e1b6c89c9a65). personal/tarefas/endless removidos (backup ~/.hermes/backups/profiles-2026-10-05/).',
  'Painel 4173. Biblioplex (~/projects/biblioplex, ex-collection+garimpo): 5273 serve /api e /garimpo; serviços biblioplex-*; docs/BIBLIOPLEX.md. Liga: nunca paralelo (só mocks). LAN: lan-proxy.service → 192.168.68.102 início :8000 (inicio/apps.json), Biblioplex :5274, painel :4174. Dashboard Hermes :9119 (Basic Auth admin).',
  'Sweep de tarefas (watchdog, 9/14/19h) → `Vault - Endless Access/tasks/my-tasks.md` e `Vault - Personal/concepts/tarefas-bernardo.md`; script profiles/watchdog/scripts/task_sweep.py. Credencial de skill em perfil: cópia, não symlink.',
  "Repo studio (~/projects/studio): action items → Todoist 'Endless Access/studio'; review na skill code-review antes de abrir PR.",
];

export const USER_MEMORY = [
  'Bernardo Campos, designer e dono do Endless Access. Escreve em pt-BR; código, commits e comentários em inglês.',
  'Prefere respostas diretas e curtas; quer ver o resultado verificado, não o plano.',
  'Usa Windows no dia a dia e acessa o servidor pela rede de casa (192.168.68.102) e pelo Tailscale.',
  'Gosta de telas com estados (carregando, erro, vazio) antes de variações de design.',
];
