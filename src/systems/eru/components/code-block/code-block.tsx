import '../code-highlight/code-highlight.css'

import hljs from 'highlight.js/lib/common'
import { useMemo } from 'react'

import { cn } from '#studio/runtime'

const HIGHLIGHT_MAX_CHARS = 200_000

const ALIASES: Record<string, string> = {
  shell: 'bash',
  tsx: 'typescript',
  jsx: 'javascript',
  html: 'xml',
  toml: 'ini',
  conf: 'ini'
}

function highlightLanguage(language: string | undefined) {
  if (!language) {
    return undefined
  }

  const name = ALIASES[language] ?? language

  return hljs.getLanguage(name) ? name : undefined
}

export function CodeBlock({ code, language, className }: { code: string; language?: string; className?: string }) {
  const resolved = highlightLanguage(language)

  const html = useMemo(
    () => (resolved && code.length <= HIGHLIGHT_MAX_CHARS ? hljs.highlight(code, { language: resolved, ignoreIllegals: true }).value : null),
    [code, resolved]
  )

  return (
    <pre className={cn('overflow-auto rounded-lg border bg-muted/40 p-3 font-mono text-xs leading-relaxed', className)}>
      {html === null ? (
        <code>{code}</code>
      ) : (
        <code className={`hljs language-${resolved} bg-transparent! p-0!`} dangerouslySetInnerHTML={{ __html: html }} />
      )}
    </pre>
  )
}
