import { defineReferenceAdapter, moveCode, copyCode, cssReferences } from '#studio/references';

// Supporting code/styles participate even when they are underscore helpers.
export default [
  defineReferenceAdapter({
    extensions: ['.tsx', '.ts', '.jsx', '.js', '.mts', '.mjs', '.cts', '.cjs'],
    move: moveCode,
    copy: copyCode,
  }),
  defineReferenceAdapter({
    extensions: ['.css'],
    move: (source, _path, context) => cssReferences(source, context.relativeTarget),
    copy: source => source,
  }),
];
