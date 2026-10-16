import { cn } from '#studio/runtime'

/** A luz que atravessa o texto do que está acontecendo agora: o texto fica parado em `--muted`, e uma cópia em `--ink` passa por uma janela. */
export function Shine({ text, className }: { text: string; className?: string }) {
  return (
    <span className={cn('shine', className)}>
      <span className="shine-base">{text}</span>
      <span aria-hidden className="shine-window">
        <span className="shine-copy">{text}</span>
      </span>
    </span>
  )
}
