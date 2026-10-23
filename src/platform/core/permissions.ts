// Section policies describe artifact ownership. Shared source writes additionally
// require resource authority through canPerform. Local identity is workflow policy,
// not filesystem authentication. Runtime import boundaries are independent.
export { studioRole } from './config.ts';
import { systemRegistered } from './config.ts';
import { MODULE_ROOTS, SYSTEM_CONTENT_KEY, systemIdOfPath } from './roots.ts';
import type { ModuleSpec } from './modules/index.ts';

export type Policy = 'owner' | 'maintainers' | 'open' | 'none';

// What the policy needs to know: who is asking (their contributor key, or null), the key the item
// is under, and its maintainers if it has any.
export type Subject = { me: string | null; key: string; maintainers?: readonly string[] };

// meta.json "maintainers" if it's a list of at least one key, else null. Keys repeat nothing.
export const parseMaintainers = (value: unknown): string[] | null => {
  if (!Array.isArray(value) || !value.length) return null;
  if (!value.every(k => typeof k === 'string' && /^[a-z0-9][a-z0-9-]*$/.test(k))) return null;
  return [...new Set(value as string[])];
};

// Whether `key` (your contributor key, or null) is one of these maintainers.
export const canMaintain = (maintainers: readonly string[] | undefined, key: string | null) =>
  Boolean(key && maintainers?.includes(key));

// The policy of the section a key opens: a module's, else "owner" (a contributor's folder).
export function policyFor(key: string, modules: readonly ModuleSpec[]): Policy {
  if (key === SYSTEM_CONTENT_KEY) return 'open';
  const section = modules.find(m => m.section?.key === key)?.section;
  return section ? (section.policy ?? 'none') : 'owner';
}

// Whether you own it: its contributor, or one of its maintainers. Owning is what lets you archive,
// delete, publish or unpublish, and it is never true of open files.
export function canOwn(policy: Policy, { me, key, maintainers }: Subject): boolean {
  if (policy === 'owner') return me !== null && key === me;
  if (policy === 'maintainers') return canMaintain(maintainers, me);
  return false;
}

// Whether you may change its files.
export const canChange = (policy: Policy, subject: Subject) => canOwn(policy, subject);

// The sentence for why you can't, when you can't.
export function whyNot(policy: Policy, me: string | null): string {
  if (policy === 'none') return "This can't be changed from the app.";
  if (!me) return "You're not set up as a contributor yet. Ask your agent to add you.";
  if (policy === 'maintainers') return 'Only its maintainers can change it.';
  return 'This prototype belongs to someone else. You can change only your own.';
}

import { studioRole as roleOf, type StudioConfig } from './config.ts';

export type Resource =
  | { kind: 'prototype'; owner: string }
  | { kind: 'system'; id: string; role: 'platform' | 'prototype'; status: 'active' | 'archived' }
  | { kind: 'platform' | 'module' };
export type ResourceAction = 'read' | 'edit' | 'rename' | 'manage';

// Why an action is refused: the Git identity matches no profile ("identity"), the contributor is recognised but
// lacks the role ("admin", "maintainer", "owner"), or nobody may do it to this resource ("unavailable").
export type Refusal = 'identity' | 'admin' | 'maintainer' | 'owner' | 'unavailable';

export function permissionRefusal(
  config: Partial<StudioConfig>,
  actor: string | null,
  contributors: readonly string[],
  resource: Resource,
  action: ResourceAction,
): Refusal | null {
  if (action === 'read') return null;
  const role = roleOf(config, actor, contributors);
  if (!role) return 'identity';
  if (role === 'admin' && resource.kind !== 'system') return null;
  if (resource.kind === 'prototype') return resource.owner === actor ? null : 'owner';
  if (resource.kind !== 'system') return 'admin';
  // The platform system is always part of the studio; any other must be registered in `systems`.
  if (!systemRegistered(config, resource.id, resource.role)) return 'unavailable';
  if (resource.role === 'platform') return action !== 'edit' ? 'unavailable' : role === 'admin' ? null : 'admin';
  if (action === 'manage') return role === 'admin' ? null : 'admin';
  if (resource.status !== 'active') return 'unavailable';
  if (role === 'admin' || Boolean(actor && config.systemMaintainers?.[resource.id]?.includes(actor))) return null;
  return 'maintainer';
}

// Runtime import boundaries remain separate from human write authority.
export const canPerform = (...args: Parameters<typeof permissionRefusal>): boolean => !permissionRefusal(...args);

// The sentence for a refusal. `email` is the Git email that matched nothing; `hint` adds a next step, such as a
// candidate profile to link.
export function refusalMessage(
  refusal: Refusal,
  { email, system, hint }: { email?: string; system?: string; hint?: string } = {},
): string {
  if (refusal === 'identity')
    return [
      `Your Git identity (${email || 'no Git email set'}) doesn't match a contributor profile, so the Studio can't check your permissions.`,
      hint ||
        `Run \`pnpm join\` to register, or to link this email to your existing profile (\`pnpm join --link <key>\`, or \`pnpm studio profile --as <key> --add-email ${email || '<email>'}\`).`,
    ].join(' ');
  if (refusal === 'admin') return 'Only an Admin can do this. You are recognised as a contributor, not an Admin.';
  if (refusal === 'maintainer')
    return `Only an Admin or a maintainer of ${system ? `the ${system} system` : 'this system'} can do this. You are recognised, but not one of its maintainers.`;
  if (refusal === 'owner') return 'This prototype belongs to someone else. You can change only your own.';
  return `${system ? `The ${system} system` : 'This'} isn't available for this operation: it isn't registered, is archived, or is the platform system.`;
}

export function pathResource(
  file: string,
  systems: Record<string, { role: 'platform' | 'prototype'; status: 'active' | 'archived' }>,
): Resource {
  const parts = file.replace(/^\/?src\//, '').split('/');
  if (parts[0] === 'prototypes' && parts[1]) return { kind: 'prototype', owner: parts[1] };
  const system = systemIdOfPath(file);
  if (system && systems[system]) return { kind: 'system', id: system, ...systems[system] };
  // Module code is a module's, in the supplied root (src/platform/modules) as in the team's, though the supplied one is under src/platform.
  const path = parts.join('/');
  const inModuleRoot = MODULE_ROOTS.some(root => {
    const base = root.replace(/^src\//, '');
    return path === base || path.startsWith(`${base}/`);
  });
  return { kind: inModuleRoot ? 'module' : 'platform' };
}

// Availability and identity changes must go through managed lifecycle operations.
export const sameSystemIdentity = (before: Record<string, unknown>, after: Record<string, unknown>) =>
  ['studioId', 'role', 'status', 'label'].every(key => before[key] === after[key]);
