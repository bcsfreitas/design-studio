import semver from 'semver';

export const FIRST_PUBLIC_RELEASE = '0.1.0';

export function isSupportedRelease(input, { includePrerelease = false } = {}) {
  const version = semver.valid(String(input).replace(/^v/, ''));
  return Boolean(
    version && semver.gte(version, FIRST_PUBLIC_RELEASE) && (includePrerelease || !semver.prerelease(version)),
  );
}
