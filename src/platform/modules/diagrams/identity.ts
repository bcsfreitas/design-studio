import { resourceId, identityFromDeclarations, type IdentityMetadata } from '#studio/files';
const bomOf = (source: string) => (source.startsWith('\uFEFF') ? '\uFEFF' : '');
const newlineOf = (source: string) => (source.includes('\r\n') ? '\r\n' : '\n');

export const diagramIdentity: IdentityMetadata = {
  read(source) {
    const header = /^\uFEFF?(?:\s|%%[^\r\n]*)*/.exec(source)?.[0] ?? '';
    return identityFromDeclarations(
      [...header.replace(/^\uFEFF/, '').matchAll(/^[ \t]*%%\s*@studio-id\b([^\r\n]*)/gm)].map(match => match[1].trim()),
    );
  },
  write(source, id) {
    resourceId(id);
    const current = this.read(source);
    if (current === id) return source;
    if (current) return source.replace(/(%%\s*@studio-id\s+)[^\r\n]+/, `$1${id}`);
    const bom = bomOf(source);
    return `${bom}%% @studio-id ${id}${newlineOf(source)}${source.slice(bom.length)}`;
  },
};
