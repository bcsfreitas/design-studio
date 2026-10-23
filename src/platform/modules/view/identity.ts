import { resourceId, identityFromDeclarations, type IdentityMetadata } from '#studio/files';
import { declaredStates, insertStateDeclaration, stateDeclarations } from './states.ts';
const bomOf = (source: string) => (source.startsWith('﻿') ? '﻿' : '');
const newlineOf = (source: string) => (source.includes('\r\n') ? '\r\n' : '\n');

// Identity is recognized only in the leading comment region, never in code strings.
export const viewIdentity: IdentityMetadata = {
  read(source) {
    const header = /^﻿?(?:\s|\/\*[\s\S]*?\*\/|\/\/[^\r\n]*)*/.exec(source)?.[0] ?? '';
    const tags = [...header.matchAll(/@studio-id\b([^\r\n]*)/g)];
    return identityFromDeclarations(tags.map(match => /^\s+([^\s*]+)(?:\s*\*\/)?\s*$/.exec(match[1])?.[1] ?? ''));
  },
  write(source, id) {
    resourceId(id);
    const current = this.read(source);
    if (current === id) return source;
    if (current) return source.replace(/(@studio-id\s+)[^\s*]+/, `$1${id}`);
    const bom = bomOf(source);
    return `${bom}/** @studio-id ${id} */${newlineOf(source)}${source.slice(bom.length)}`;
  },
  // Named states (states.ts): each declared title is a child keyed by that title, with the identity of its
  // `/** @studio-state <id> <title> */` declaration. Declarations naming no state are reported by the type's check.
  children: {
    read(source) {
      const declarations = stateDeclarations(source);
      const ids = new Map<string, ReturnType<typeof resourceId>>();
      for (const { id, title } of declarations) {
        if (ids.has(title)) throw new Error(`A view must declare the identity of state "${title}" only once.`);
        ids.set(title, resourceId(id));
      }
      return declaredStates(source).titles.map(key => ({ key, studioId: ids.get(key) ?? null }));
    },
    write(source, key, id) {
      resourceId(id);
      const current = stateDeclarations(source).find(declaration => declaration.title === key);
      if (current?.id === id) return source;
      if (current) {
        const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return source.replace(new RegExp(`(@studio-state\\s+)\\S+(\\s+${escaped}\\s*(?:\\*\\/|\\r?\\n|$))`), `$1${id}$2`);
      }
      return insertStateDeclaration(source, key, id);
    },
  },
};
