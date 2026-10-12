import { resourceId, identityFromDeclarations, type IdentityMetadata } from '#studio/files';
const bomOf = (source: string) => (source.startsWith('\uFEFF') ? '\uFEFF' : '');
const newlineOf = (source: string) => (source.includes('\r\n') ? '\r\n' : '\n');

// Identity is recognized only in the leading comment region, never in code strings.
export const viewIdentity: IdentityMetadata = {
  read(source) {
    const header = /^\uFEFF?(?:\s|\/\*[\s\S]*?\*\/|\/\/[^\r\n]*)*/.exec(source)?.[0] ?? '';
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
};
