import { mergeProps } from '@base-ui/react/merge-props'
import { useRender } from '@base-ui/react/use-render'
import { ChevronRight } from 'lucide-react'
import { useId, type ReactElement, type ReactNode } from 'react'

import { cn } from '#studio/runtime'

/**
 * Um grupo da lista agrupada das áreas: o rótulo com a contagem ("Ativos · 5") e as linhas entre fios de 1 px, sem
 * cartão. Sem `heading`, a lista leva só o `label`, para leitores de tela.
 */
export function ListGroup({ heading, label, children }: { heading?: string; label?: string; children: ReactNode }) {
  const id = useId()

  return (
    <section aria-labelledby={heading ? id : undefined} className="flex flex-col gap-2">
      {heading ? (
        <h2 id={id} className="px-1 font-mono text-[10px] leading-[1.7] font-medium tracking-[0.16em] text-dim uppercase">
          {heading}
        </h2>
      ) : null}
      <ul aria-labelledby={heading ? id : undefined} aria-label={heading ? undefined : label} className="flex flex-col divide-y border-y">
        {children}
      </ul>
    </section>
  )
}

/**
 * Uma linha da lista agrupada. A linha inteira é o alvo: `render` é o link que ela abre e cobre a linha toda; `action` fica
 * por cima, à direita, e é a única coisa da linha que não abre o link.
 */
export function ListRow({ label, render, action, children }: { label: string; render: ReactElement; action?: ReactNode; children: ReactNode }) {
  const link = useRender({
    render,
    props: mergeProps<'a'>(
      {
        className: cn(
          'flex min-h-11 min-w-0 flex-1 items-start gap-3 py-3 pl-4 outline-none after:absolute after:inset-0 focus-visible:after:ring-2 focus-visible:after:ring-ring/50 focus-visible:after:ring-inset',
          action ? 'pr-2' : 'pr-3'
        )
      },
      {
        children: (
          <>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">{children}</span>
            {action ? null : <ChevronRight aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-colors group-hover/row:text-foreground" />}
          </>
        )
      }
    )
  })

  return (
    <li aria-label={label} className="group/row relative flex items-start transition-colors hover:bg-muted/40">
      {link}
      {action ? <div className="relative z-10 flex shrink-0 items-center self-center py-2 pr-3">{action}</div> : null}
    </li>
  )
}
