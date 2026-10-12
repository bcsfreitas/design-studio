import { compatible } from '@/platform/core/modules';
import { assertUniqueExtensions, type FileTypeSpec } from '@/platform/core/fileTypes';
import { MODULES } from './modules';
import { isEnabled } from './config';
const idOf = (path: string) => path.split('/').at(-2)!;
const specs = import.meta.glob<FileTypeSpec>('/__studio_modules__/type.ts', { eager: true, import: 'default' });

// A type is on when its module is installed and studio.config.json leaves it on (the same rule the build uses).
const on = (path: string) => MODULES.some(m => m.id === idOf(path) && compatible(m)) && isEnabled(idOf(path));

export const FILE_TYPES: Record<string, FileTypeSpec> = Object.fromEntries(
  Object.entries(specs)
    .filter(([path]) => on(path))
    .map(([path, spec]) => [idOf(path), spec]),
);

assertUniqueExtensions(FILE_TYPES);
