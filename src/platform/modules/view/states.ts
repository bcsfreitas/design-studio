// Named states of one view: `export const states = [{ title: 'Member', props: { ... } }, ...]`. Each state renders
// the view's default export with its props, and is a child artifact with a permanent identity declared in the
// view's leading comments: /** @studio-state <id> <title> */. Node reads this file (build, identity tools), so it
// reads titles statically and stays free of browser and React code.

// The leading comment region, as in identity.ts: identity is never read from code.
const HEADER = /^﻿?(?:\s|\/\*[\s\S]*?\*\/|\/\/[^\r\n]*)*/;
const STATE_TAG = /@studio-state\b([^\r\n]*)/g;
const EXPORT = /\bexport\s+const\s+states\b[^=]*=\s*/;

export type DeclaredStates = { titles: string[]; problems: string[] };

// Reads the titles of `export const states = [...]` without running the file. Each title must be a string
// literal on the state object itself (a `title` key inside props doesn't count). A file without the export has none.
export function declaredStates(source: string): DeclaredStates {
  const found = EXPORT.exec(source);
  if (!found) return { titles: [], problems: [] };
  let i = found.index + found[0].length;
  while (source[i] === '(') i++;
  if (source[i] !== '[')
    return { titles: [], problems: ['export const states must be a list written in place: [{ title, props }, ...].'] };
  const titles: string[] = [],
    problems: string[] = [];
  let depth = 0,
    element = -1,
    titled = true;
  for (; i < source.length; i++) {
    const ch = source[i];
    if (ch === '/' && source[i + 1] === '/') {
      i = source.indexOf('\n', i);
      if (i < 0) break;
      continue;
    }
    if (ch === '/' && source[i + 1] === '*') {
      i = source.indexOf('*/', i + 2) + 1;
      if (i <= 0) break;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      i = stringEnd(source, i);
      continue;
    }
    if (ch === '[' || ch === '{' || ch === '(') {
      depth++;
      if (depth === 2 && ch === '{') {
        if (!titled) problems.push(`state ${element + 1} needs a title.`);
        element++;
        titled = false;
      }
      continue;
    }
    if (ch === ']' || ch === '}' || ch === ')') {
      depth--;
      if (depth === 0) break;
      continue;
    }
    // A key of the state object itself.
    if (depth === 2 && /[A-Za-z_$]/.test(ch) && !/[\w$]/.test(source[i - 1] ?? '')) {
      const key = /^title\s*:\s*/.exec(source.slice(i));
      if (!key) continue;
      const start = i + key[0].length;
      const quote = source[start];
      const end = quote === '"' || quote === "'" || quote === '`' ? stringEnd(source, start) : -1;
      const raw = end > start ? source.slice(start + 1, end) : null;
      if (raw === null || (quote === '`' && raw.includes('${')) || /\\/.test(raw)) {
        problems.push(`state ${element + 1} needs a title written as plain text in quotes, like title: 'Member'.`);
      } else titles.push(raw);
      titled = true;
      i = Math.max(i, end);
    }
  }
  if (!titled) problems.push(`state ${element + 1} needs a title.`);
  for (const title of titles) {
    if (!title.trim() || title !== title.trim() || /[\r\n]|\*\//.test(title))
      problems.push(`state title ${JSON.stringify(title)} must be non-empty text without surrounding spaces or */.`);
  }
  const repeated = titles.filter((title, index) => titles.indexOf(title) !== index);
  for (const title of new Set(repeated)) problems.push(`two states are titled ${JSON.stringify(title)}; titles must differ.`);
  return { titles, problems };
}

function stringEnd(source: string, start: number) {
  const quote = source[start];
  for (let i = start + 1; i < source.length; i++) {
    if (source[i] === '\\') i++;
    else if (source[i] === quote) return i;
  }
  return source.length;
}

// The `@studio-state <id> <title>` declarations in the leading comments, in order.
export function stateDeclarations(source: string): { id: string; title: string }[] {
  const header = HEADER.exec(source)?.[0] ?? '';
  return [...header.matchAll(STATE_TAG)].map(match => {
    const parsed = /^\s+(\S+)\s+(.*?)\s*(?:\*\/\s*)?$/.exec(match[1]);
    return { id: parsed?.[1] ?? '', title: parsed?.[2] ?? '' };
  });
}

// What the build reports for a view's states (type.ts check): unreadable titles, and declarations that name no
// state, which is what renaming a title in code but not in its @studio-state comment leaves behind.
export function stateProblems(source: string): string[] {
  const { titles, problems } = declaredStates(source);
  for (const declared of stateDeclarations(source))
    if (!titles.includes(declared.title))
      problems.push(
        `@studio-state ${declared.id} names no state titled ${JSON.stringify(declared.title)}. When renaming a state, change its title in the comment too, which keeps its permanent link; remove the comment line only when removing the state.`,
      );
  return problems;
}

// Where a new declaration goes: after the last comment holding a view or state identity, else at the top.
export function insertStateDeclaration(source: string, title: string, id: string) {
  const bom = source.startsWith('﻿') ? '﻿' : '';
  const nl = source.includes('\r\n') ? '\r\n' : '\n';
  const line = `/** @studio-state ${id} ${title} */`;
  const header = HEADER.exec(source)?.[0] ?? '';
  let at = -1;
  for (const comment of header.matchAll(/\/\*[\s\S]*?\*\/|\/\/[^\r\n]*/g))
    if (/@studio-(?:id|state)\b/.test(comment[0])) at = comment.index! + comment[0].length;
  if (at < 0) return `${bom}${line}${nl}${source.slice(bom.length)}`;
  return source.slice(0, at) + nl + line + source.slice(at);
}
