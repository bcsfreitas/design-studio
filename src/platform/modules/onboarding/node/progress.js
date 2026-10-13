import { readContributorPreferences, updateContributorPreferences } from '#studio/preferences';

export function claimWelcome(root, contributor) {
  if (contributor === null) return null;
  const current = readContributorPreferences(root, { actor: contributor, module: 'onboarding' });
  if (current.value.welcomeDismissed) return false;
  updateContributorPreferences(root, {
    actor: contributor,
    module: 'onboarding',
    base: current.version,
    value: { ...current.value, welcomeDismissed: true },
  });
  return true;
}
