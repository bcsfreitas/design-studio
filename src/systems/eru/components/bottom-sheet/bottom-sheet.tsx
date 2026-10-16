import { motion } from 'motion/react'
import type { KeyboardEvent, ReactNode, Ref } from 'react'

import { EASE } from '../../lib/motion'
import { cn } from '#studio/runtime'

/** A folha sobe do pé; a saída é mais curta que a entrada. */
const RISE = { type: 'tween' as const, duration: 0.24, ease: EASE }
const FADE_OUT = { duration: 0.12, ease: EASE }

/**
 * A folha do celular: sobe do pé sobre um fundo escurecido, que fecha ao toque, e respeita o indicador de início. Quem usa
 * põe dentro de um `AnimatePresence` para a saída animar, e cuida do Esc e do foco.
 */
export function BottomSheet({
  label,
  id,
  onClose,
  onKeyDown,
  className,
  children,
  ref
}: {
  label: string
  id?: string
  onClose: () => void
  onKeyDown?: (event: KeyboardEvent<HTMLElement>) => void
  className?: string
  children: ReactNode
  ref?: Ref<HTMLElement>
}) {
  return (
    <>
      <motion.div aria-hidden className="fixed inset-0 z-50 bg-black/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: FADE_OUT }} onClick={onClose} />
      <motion.aside
        ref={ref}
        id={id}
        aria-label={label}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%', transition: FADE_OUT }}
        transition={RISE}
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 flex max-h-[calc(100svh-var(--safe-top)-3rem)] flex-col overflow-y-auto overscroll-contain rounded-t-2xl border-t bg-popover px-4 pt-2 pb-safe-4 text-popover-foreground shadow-card outline-none',
          className
        )}
      >
        <span aria-hidden className="mx-auto mb-3 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/30" />
        {children}
      </motion.aside>
    </>
  )
}
