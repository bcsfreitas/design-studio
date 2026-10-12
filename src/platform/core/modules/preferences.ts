import { preferenceProblems, type ModuleSpec } from './index.ts';

export const preferenceDefaults = (modules: readonly ModuleSpec[]) =>
  Object.fromEntries(
    modules
      .filter(module => module.preferences)
      .map(module => [module.id, structuredClone(module.preferences!.defaults)]),
  );
export function contributorPreferenceProblems(
  contributors: Record<string, { preferences?: unknown }>,
  modules: readonly ModuleSpec[],
): string[] {
  return Object.entries(contributors).flatMap(([key, profile]) =>
    modules.flatMap(module =>
      !module.preferences
        ? []
        : preferenceProblems(
            (profile.preferences as Record<string, unknown> | undefined)?.[module.id],
            module.preferences,
          ).map(
            problem =>
              `Contributor "${key}": preferences.${module.id}: ${problem}. Run pnpm studio preferences --module ${module.id} --plan <file>.`,
          ),
    ),
  );
}
