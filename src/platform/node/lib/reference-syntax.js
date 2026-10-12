// Shared source grammars. Adapters select syntax; the platform supplies target resolution.
import ts from 'typescript';

export function moveCode(text, file, { appTarget, navigation, importedTarget, link }) {
  const source = ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const changes = [];
  const visit = node => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      const parent = node.parent;
      const imported =
        ((ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent)) && parent.moduleSpecifier === node) ||
        (ts.isCallExpression(parent) &&
          parent.arguments[0] === node &&
          (parent.expression.kind === ts.SyntaxKind.ImportKeyword ||
            parent.expression.getText(source) === 'require')) ||
        (ts.isNewExpression(parent) && parent.expression.getText(source) === 'URL' && parent.arguments?.[0] === node);
      const attributeParent = ts.isJsxExpression(parent) ? parent.parent : parent;
      const attribute =
        (ts.isJsxAttribute(attributeParent) || ts.isPropertyAssignment(attributeParent)) &&
        ['to', 'href', 'src'].includes(attributeParent.name.getText(source).replace(/['"]/g, ''));
      let next = appTarget(node.text);
      if (!imported && next === node.text) next = navigation(node.text, Boolean(attribute));
      if (next === node.text && imported) next = importedTarget(node.text);
      else if (next === node.text && attribute) next = link(node.text);
      if (next !== node.text) {
        const start = node.getStart(source),
          quote = text[start];
        const escaped = next
          .replace(/\\/g, '\\\\')
          .replace(/\r/g, '\\r')
          .replace(/\n/g, '\\n')
          .replace(new RegExp(quote, 'g'), '\\' + quote)
          .replace(/\$/g, quote === '`' ? '\\$' : '$');
        changes.push({ start: start + 1, end: node.end - 1, value: escaped });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  for (const change of changes.sort((a, b) => b.start - a.start))
    text = text.slice(0, change.start) + change.value + text.slice(change.end);
  return text;
}

export function copyCode(text, file, { target, sceneUpdate = {} }) {
  const source = ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  if (source.parseDiagnostics.length) throw new Error(`${file}: fix syntax before migrating browser references.`);
  const edits = [];
  const visit = node => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      const parent = node.parent;
      const imported =
        ((ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent)) && parent.moduleSpecifier === node) ||
        (ts.isCallExpression(parent) &&
          parent.arguments[0] === node &&
          (parent.expression.kind === ts.SyntaxKind.ImportKeyword || parent.expression.getText(source) === 'require'));
      const next = imported ? node.text : target(node.text);
      if (next !== node.text) {
        const start = node.getStart(source),
          quote = text[start];
        const value = next
          .replace(/\\/g, '\\\\')
          .replace(/\r/g, '\\r')
          .replace(/\n/g, '\\n')
          .replace(new RegExp(quote, 'g'), '\\' + quote)
          .replace(/\$/g, quote === '`' ? '\\$' : '$');
        edits.push({ start: start + 1, end: node.end - 1, value });
      }
    }
    if (ts.isTemplateExpression(node)) sceneUpdate.computed?.(node.getText(source));
    ts.forEachChild(node, visit);
  };
  visit(source);
  return edits
    .sort((a, b) => b.start - a.start)
    .reduce((result, edit) => result.slice(0, edit.start) + edit.value + result.slice(edit.end), text);
}

export function markdownReferences(text, link) {
  // Markdown destinations and reference definitions; leave prose and code fences alone.
  const blocks = text.split(/(^```[^\n]*\n[\s\S]*?^```[^\n]*$|^~~~[^\n]*\n[\s\S]*?^~~~[^\n]*$)/m);
  return blocks
    .map((block, index) =>
      index % 2
        ? block
        : block
            .replace(
              /(!?\[[^\]\n]*\]\()(<[^>\n]+>|[^\s)]+)([^\n]*?\))/g,
              (_, lead, value, tail) =>
                lead + (value.startsWith('<') ? '<' + link(value.slice(1, -1)) + '>' : link(value)) + tail,
            )
            .replace(
              /^(\s*\[[^\]\n]+\]:\s*)(<[^>\n]+>|\S+)/gm,
              (_, lead, value) => lead + (value.startsWith('<') ? '<' + link(value.slice(1, -1)) + '>' : link(value)),
            ),
    )
    .join('');
}

export function cssReferences(text, relativeTarget) {
  return text
    .replace(/(url\(\s*['"]?)([^'")\s]+)(['"]?\s*\))/g, (_, lead, value, tail) => lead + relativeTarget(value) + tail)
    .replace(/(@import\s+['"])([^'"]+)(['"])/g, (_, lead, value, tail) => lead + relativeTarget(value) + tail);
}
