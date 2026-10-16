import ReactMarkdown, { type Components, type ExtraProps } from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { CodeBlock } from '../code-block/code-block'
import { cn } from '#studio/runtime'

const COMMON = [
  'min-w-0 text-sm break-words',
  '[&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4',
  '[&_:not(pre)>code]:rounded [&_:not(pre)>code]:bg-muted [&_:not(pre)>code]:px-1 [&_:not(pre)>code]:py-0.5 [&_:not(pre)>code]:font-mono [&_:not(pre)>code]:text-[0.85em]',
  '[&_ul]:list-disc [&_ol]:list-decimal [&_blockquote]:border-l-2 [&_blockquote]:text-muted-foreground',
  '[&_table]:block [&_table]:w-max [&_table]:max-w-full [&_table]:overflow-x-auto [&_table]:border-collapse',
  '[&_th]:text-left [&_th]:font-medium [&_img]:max-w-full [&_input[type=checkbox]]:mr-2'
]

const DOCUMENT = [
  'leading-relaxed',
  '[&_[data-titulo]]:mt-6 [&_[data-titulo]]:mb-3 [&_[data-titulo]]:text-2xl [&_[data-titulo]]:font-semibold [&_[data-titulo]]:tracking-tight [&_[data-titulo]:first-child]:mt-0',
  '[&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold',
  '[&_h3]:mt-5 [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold',
  '[&_h4]:mt-4 [&_h4]:mb-2 [&_h4]:font-semibold',
  '[&_p]:my-3 [&_ul]:my-3 [&_ul]:pl-6 [&_ol]:my-3 [&_ol]:pl-6 [&_li]:my-1',
  '[&_blockquote]:my-3 [&_blockquote]:pl-4 [&_hr]:my-6 [&_hr]:border-border [&_table]:my-3',
  '[&_th]:border [&_th]:bg-muted [&_th]:px-3 [&_th]:py-1.5 [&_td]:border [&_td]:px-3 [&_td]:py-1.5'
]

const COMPACT = [
  '[&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mt-4 [&_h3]:text-base [&_h3]:font-semibold [&_h4]:mt-3 [&_h4]:font-semibold',
  '[&_h2:first-child]:mt-0 [&_h3:first-child]:mt-0 [&_h4:first-child]:mt-0',
  '[&_p]:my-2 [&_p]:leading-relaxed [&_p:first-child]:mt-0 [&_p:last-child]:mb-0',
  '[&_ul]:my-2 [&_ul]:space-y-1 [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:space-y-1 [&_ol]:pl-5',
  '[&_blockquote]:my-2 [&_blockquote]:pl-3 [&_hr]:my-4 [&_table]:my-3 [&_table]:rounded-lg [&_table]:border',
  '[&_th]:border-b [&_th]:bg-muted/50 [&_th]:px-3 [&_th]:py-2 [&_td]:border-b [&_td]:px-3 [&_td]:py-2 [&_td]:align-top'
]

function fencedCode(node: ExtraProps['node']) {
  const code = node?.children[0]

  if (!code || code.type !== 'element' || code.tagName !== 'code') {
    return null
  }

  const classes = code.properties.className
  const languageClass = Array.isArray(classes) ? classes.map(String).find(name => name.startsWith('language-')) : undefined
  const text = code.children.map(child => (child.type === 'text' ? child.value : '')).join('')

  return { language: languageClass?.slice('language-'.length), text: text.replace(/\n$/, '') }
}

const DOCUMENT_COMPONENTS: Components = {
  // O título principal da página fica na barra da página; o título do documento vira o primeiro nível abaixo dela.
  h1: ({ node: _node, ...props }) => <h2 data-titulo="" {...props} />,
  a: ({ node: _node, ...props }) => <a target="_blank" rel="noreferrer noopener" {...props} />,
  pre: ({ node, children }) => {
    const code = fencedCode(node)

    return code ? <CodeBlock code={code.text} language={code.language} className="my-3 overflow-x-auto" /> : <pre>{children}</pre>
  }
}

const COMPACT_COMPONENTS: Components = {
  ...DOCUMENT_COMPONENTS,
  h1: ({ node: _node, ...props }) => <h2 {...props} />,
  h2: ({ node: _node, ...props }) => <h3 {...props} />,
  h3: ({ node: _node, ...props }) => <h4 {...props} />
}

interface MarkdownProps {
  children: string
  variant?: 'document' | 'compact'
  className?: string
  /** Troca a forma de alguns elementos (ex.: imagens e links relativos resolvidos pela pasta de um documento); o resto fica igual. */
  components?: Components
}

export function Markdown({ children, variant = 'document', className, components }: MarkdownProps) {
  const compact = variant === 'compact'
  const base = compact ? COMPACT_COMPONENTS : DOCUMENT_COMPONENTS

  return (
    <div className={cn(COMMON, compact ? COMPACT : DOCUMENT, className)}>
      <ReactMarkdown remarkPlugins={[[remarkGfm, { singleTilde: false }]]} components={components ? { ...base, ...components } : base}>
        {children}
      </ReactMarkdown>
    </div>
  )
}
