// The server's folders as the Arquivos pages list them: the home folder, ~/projects and ~/projects/eru, with the sizes eru
// shows. Folders not listed here open empty.
export interface FileEntry {
  name: string;
  path: string;
  is_directory: boolean;
  size: number | null;
}

export const HOME = '/home/hermes';

const dirs = (parent: string, names: string[]): FileEntry[] => names.map(name => ({ name, path: `${parent}/${name}`, is_directory: true, size: null }));
const files = (parent: string, list: [string, number][]): FileEntry[] => list.map(([name, size]) => ({ name, path: `${parent}/${name}`, is_directory: false, size }));

const ERU = `${HOME}/projects/eru`;

export const LISTINGS: Record<string, FileEntry[]> = {
  '/': dirs('', ['bin', 'boot', 'dev', 'etc', 'home', 'opt', 'root', 'srv', 'tmp', 'usr', 'var']),
  '/home': dirs('/home', ['hermes']),
  [HOME]: [
    ...dirs(HOME, ['.agents', '.bun', '.cache', '.claude', '.codex', '.config', '.firecrawl', '.hermes', '.local', '.npm', '.pki', '.ssh', '.yarn', 'artifacts', 'Documents', 'hermes-webui', 'invoice-automation-server', 'projects', 'Vaults', 'workspace']),
    ...files(HOME, [
      ['.bash_history', 18_432],
      ['.bash_logout', 220],
      ['.bashrc', 3_771],
      ['.claude.json', 41_210],
      ['.gitconfig', 98],
      ['.profile', 807],
      ['skills-lock.json', 315],
    ]),
  ],
  [`${HOME}/projects`]: [
    ...dirs(`${HOME}/projects`, ['biblioplex', 'endless-harness', 'eru', 'eru-wt', 'harness', 'headless-chrome', 'inicio', 'painel', 'proxy', 'studio', 'studio-wt', 'typesafe-ai-skills']),
    ...files(`${HOME}/projects`, [['README.md', 1_204]]),
  ],
  [ERU]: [
    ...dirs(ERU, ['.agents', '.files', '.git', '.hermes', '.notes', '.pytest_cache', '.scratch', '.worktrees', 'deploy', 'docs', 'plugin', 'web']),
    ...files(ERU, [
      ['.gitignore', 91],
      ['AGENTS.md', 4_317],
      ['CONTEXT.md', 54_603],
      ['IDEA.md', 198],
      ['README.md', 2_436],
      ['skills-lock.json', 315],
    ]),
  ],
  [`${ERU}/docs`]: [...dirs(`${ERU}/docs`, ['adr', 'agents', 'design']), ...files(`${ERU}/docs`, [['teste-manual.md', 12_880]])],
};

export const ERU_FOLDER = ERU;
export const README = `${ERU}/README.md`;

export function parentPath(path: string) {
  const parent = path.replace(/\/[^/]+\/?$/, '');
  return parent || '/';
}

export function baseName(path: string) {
  return path === '/' ? '/' : (path.split('/').filter(Boolean).pop() ?? path);
}

export function pathSegments(path: string) {
  const parts = path.split('/').filter(Boolean);
  return parts.map((name, index) => ({ name, path: `/${parts.slice(0, index + 1).join('/')}` }));
}

export function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = size / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const rounded = value >= 10 || Number.isInteger(value) ? Math.round(value).toString() : value.toFixed(1).replace('.', ',');
  return `${rounded} ${units[unit]}`;
}

/** The entry of a path, looked up in its parent's listing. */
export function entryOf(path: string): FileEntry | undefined {
  return LISTINGS[parentPath(path)]?.find(entry => entry.path === path);
}
