import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { starterDistributionProblems } from '../lib/starter-distribution.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const problems = starterDistributionProblems(root);
if (problems.length) {
  console.error(`[starter] ${problems.join('\n')}`);
  process.exitCode = 1;
} else console.log('[starter] Only committed sample contributors and prototype files; no personal grants.');
