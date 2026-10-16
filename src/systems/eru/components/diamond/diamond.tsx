import { cn } from '#studio/runtime'

/** O losango vazado de 5 px: a ponta do fio de uma seção e a marca do ícone da página aberta. A cor da borda vem em `className`. */
export function Diamond({ className }: { className?: string }) {
  return <span aria-hidden className={cn('size-[5px] shrink-0 rotate-45 border', className)} />
}
