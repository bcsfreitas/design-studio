// Upstream release/demo policy only. Installed studios keep their own real contributor roster.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

export function starterDistributionProblems(root) {
  const files = args =>
    execFileSync('git', ['ls-files', '-z', ...args], { cwd: root, encoding: 'utf8' })
      .split('\0')
      .filter(Boolean);
  const tracked = new Set(files([]));
  const problems = [];
  // Deliberately omit --exclude-standard: ignored local profiles/work must also block release builds.
  const local = files(['--others', '--', 'contributors/', 'src/prototypes/']);
  if (local.length)
    problems.push(
      `Local contributor or prototype files are present. Build releases from a clean checkout:\n${local.join('\n')}`,
    );
  for (const file of tracked) {
    if (!/^contributors\/[^/]+\.json$/.test(file)) continue;
    try {
      const profile = JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
      if (profile.sample !== true || profile.email !== '' || profile.github !== '')
        problems.push(
          `${file}: upstream distributes fictional sample contributors with empty email and GitHub declarations only.`,
        );
    } catch (error) {
      problems.push(`${file}: ${error.message}`);
    }
  }
  if (tracked.has('studio.config.json')) {
    try {
      const config = JSON.parse(fs.readFileSync(path.join(root, 'studio.config.json'), 'utf8'));
      if (
        config.usage !== 'personal' ||
        !Array.isArray(config.admins) ||
        config.admins.length ||
        Object.values(config.systemMaintainers ?? {}).some(grants => !Array.isArray(grants) || grants.length)
      )
        problems.push('The upstream starter must use personal mode with no Admin or system maintainer assignments.');
    } catch (error) {
      problems.push(`studio.config.json: ${error.message}`);
    }
  }
  return problems;
}
