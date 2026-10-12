import path from 'node:path';
import { SYSTEM_SOURCES, refreshSystems } from './systems.js';
import { systemDocs } from './docs.js';
import { extractProps } from './extract-props.js';

export function componentProps(root) {
  refreshSystems();
  const keyed = [];
  for (const [id, sys] of Object.entries(SYSTEM_SOURCES)) {
    const dir = path.join(root, sys.components);
    for (const c of systemDocs(dir).components)
      if (c.files.source) keyed.push([`${id}/${c.files.source}`, path.join(dir, c.files.source)]);
  }
  const byFile = extractProps(
    keyed.map(([, file]) => file),
    root,
  );
  return Object.fromEntries(keyed.map(([key, file]) => [key, byFile[file] ?? []]));
}
