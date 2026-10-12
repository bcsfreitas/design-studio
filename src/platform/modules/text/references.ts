import { defineReferenceAdapter, markdownReferences } from '#studio/references';

// Markdown is also a retained source grammar for required system knowledge.
// Its source maintenance is independent of the optional Documents renderer.
export default [
  defineReferenceAdapter({
    extensions: ['.md'],
    move: (source, _path, context) =>
      context.renameText ? context.renameText(source) : markdownReferences(source, context.link),
    copy: (source, _path, context) => markdownReferences(source, context.target),
  }),
];
