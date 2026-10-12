// Source adapters return text. File resolution and writes belong to the platform.
export type MoveReferenceContext = {
  link(value: string): string;
  appTarget(value: string): string;
  relativeTarget(value: string, imported?: boolean): string;
  navigation(value: string, attribute?: boolean): string;
  importedTarget(value: string): string;
  // Legacy prototype-name migration; grammars decide whether labels also move.
  renameText?: (source: string) => string;
};

export type CopyReferenceContext = {
  target(value: string): string;
  sceneUpdate?: {
    nonce?: (element: Record<string, unknown>, next: string) => number;
    updated?: number;
    unresolved?: (value: string) => void;
    computed?: (value: string) => void;
  };
};

export type ReferenceAdapter = {
  extensions: readonly string[];
  move(source: string, path: string, context: MoveReferenceContext): string;
  copy(source: string, path: string, context: CopyReferenceContext): string;
};

export function defineReferenceAdapter(adapter: ReferenceAdapter): ReferenceAdapter {
  if (
    !adapter ||
    !Array.isArray(adapter.extensions) ||
    !adapter.extensions.length ||
    adapter.extensions.some(ext => typeof ext !== 'string' || !/^\.[a-z0-9]+$/.test(ext)) ||
    new Set(adapter.extensions).size !== adapter.extensions.length
  )
    throw new Error('Reference adapter: declare unique source extensions.');
  if (typeof adapter.move !== 'function' || typeof adapter.copy !== 'function')
    throw new Error('Reference adapter: provide move and copy source transformations.');
  return adapter;
}
