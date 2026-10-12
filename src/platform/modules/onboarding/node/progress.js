import { readPreferenceProfile, transactPreferenceProfile } from '../../../node/lib/contributor-preferences.js';

// The server supplies the resolved contributor; requests cannot select a profile.
export function claimWelcome(root, contributor) {
  if (contributor === null) return null;
  const current = readPreferenceProfile(root, contributor);
  if (typeof current.profile.welcomeDismissed !== 'boolean')
    throw Object.assign(new Error('Declare contributor welcomeDismissed explicitly as false or true.'), {
      status: 422,
    });
  if (current.profile.welcomeDismissed) return false;
  transactPreferenceProfile(root, contributor, {
    base: current.version,
    update: profile => ({ ...profile, welcomeDismissed: true }),
  });
  return true;
}
