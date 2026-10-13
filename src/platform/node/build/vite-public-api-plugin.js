// System workspaces have their own package.json. Resolve the repository's public API there too, after
// the import guard has seen the original specifier. An alias would hide that explicit boundary.
import path from 'node:path';
import { API_ENTRIES, API_FOLDER, apiSpecifier } from '../../core/modules/boundaries.ts';

export default function publicApi({ root = path.resolve(import.meta.dirname, '../../../..') } = {}) {
  return {
    name: 'studio-public-api',
    resolveId(source) {
      const entry = API_ENTRIES.find(entry => source === apiSpecifier(entry));
      return entry ? path.join(root, API_FOLDER, `${entry}.ts`) : null;
    },
  };
}
