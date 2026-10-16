// The Hermes profiles on this server, their models and the default profile's SOUL, as the Perfis pages show them.
export interface Profile {
  name: string;
  provider: string;
  model: string;
  description: string;
  is_default: boolean;
}

export const PROFILES: Profile[] = [
  { name: 'default', provider: 'anthropic', model: 'claude-opus-5-5', description: '', is_default: true },
  {
    name: 'coder',
    provider: 'anthropic',
    model: 'claude-opus-5-5',
    description:
      "Full-stack coding agent and nothing else: implements features, fixes, refactors, tests and migrations from Kanban cards or chats in Bernardo's repos (~/projects). Never touches vaults, finances or messaging.",
    is_default: false,
  },
  {
    name: 'llmwiki',
    provider: 'openai-codex',
    model: 'gpt-5.5',
    description:
      'Perfil responsável pelo intake, manutenção e higienização periódica da LLM Wiki pessoal de Bernardo. Preserva fontes brutas, atualiza sínteses, índice e log, e mantém o SCHEMA.md em dia.',
    is_default: false,
  },
  {
    name: 'mechanic',
    provider: 'anthropic',
    model: 'claude-opus-5-5',
    description:
      'Mechanic: keeps the Hermes infrastructure on this host healthy. Watches the gateway, cron jobs of every profile, systemd services, health endpoints, MCP servers and disk, and runs the nightly update.',
    is_default: false,
  },
  {
    name: 'watchdog',
    provider: 'anthropic',
    model: 'claude-opus-5-5',
    description:
      "Owns all recurring sweeps, syncs and integrations (meeting notes, task trackers, inbox/finance watchers) and Bernardo's task overview: 3x/day sweep of Asana, Todoist and the Kanban into the vaults.",
    is_default: false,
  },
];

export const SOUL = `You are Hermes Agent, built by Nous Research. Be direct: match the length of your reply to the weight of the ask — a one-line question gets a one-line answer, and finished work gets a short report of what changed, what's verified, and what's left, never a replay of the process. No filler ("Great question," "I'd be happy to"), no restating the request back, no re-summarizing what you already said, no narrating tool calls the user can see. Plain claims over adjectives; when unsure, say so plainly. Agree because it's right, not because the user said it. Depth is earned — give it when the user asks for detail, teaches, or the stakes demand it, not by default.`;

export const MODEL_PROVIDERS = [
  { slug: 'anthropic', name: 'Anthropic', models: ['claude-opus-5-5', 'claude-sonnet-5', 'claude-haiku-4-5'] },
  { slug: 'openai-codex', name: 'OpenAI Codex', models: ['gpt-5.5', 'gpt-5.5-mini'] },
];

export const PROFILE_NAME_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/;

export const PROFILE_NAME_RULE = "Use letras minúsculas, números, '-' ou '_', começando por letra ou número, com até 64 caracteres.";

export const modelLine = (profile: Profile) => [profile.provider, profile.model].filter(Boolean).join(' · ') || 'Modelo não informado';
