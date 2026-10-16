import { AnimatePresence, motion, MotionConfig } from 'motion/react'
import { Fragment, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'

import { cn } from '#studio/runtime'

export interface NotchOption {
  id: string
  label: ReactNode
  icon?: ReactNode
}

export interface NotchItem {
  id: string
  label: string
  icon?: ReactNode
  options: NotchOption[]
  value?: string
  /** O que aparece no gatilho no lugar do rótulo da opção escolhida. */
  valueLabel?: ReactNode
  onChange: (optionId: string, option: NotchOption) => void
}

export interface NotchProps {
  items: NotchItem[]
  align?: 'start' | 'center' | 'end'
  accentColor?: string
  className?: string
}

const SHELL_SPRING = { type: 'spring' as const, stiffness: 380, damping: 34 }

const LIST_VARIANTS = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.03, delayChildren: 0.06 } }
}

const OPTION_VARIANTS = {
  hidden: { opacity: 0, y: -10, filter: 'blur(4px)' },
  visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { type: 'spring' as const, stiffness: 420, damping: 30 } }
}

const ALIGN = {
  start: 'left-0',
  center: 'left-1/2 -translate-x-1/2',
  end: 'right-0'
}

/** O traço pontilhado entre dois itens do Notch. */
export function NotchDivider() {
  return <span aria-hidden className="mx-0.5 h-5 w-px shrink-0 self-center bg-[repeating-linear-gradient(180deg,var(--h3)_0px,var(--h3)_1px,transparent_1px,transparent_4px)]" />
}

/**
 * O Notch da Aceternity UI (ui.aceternity.com/components/notch) preso no fluxo da página em vez da
 * borda da tela: a barra ocupa o próprio lugar e abre as opções por cima do que vem abaixo.
 */
export function Notch({ items, align = 'start', accentColor = 'rgb(var(--tint))', className }: NotchProps) {
  const shellRef = useRef<HTMLDivElement>(null)
  const restoreFocus = useRef<string | null>(null)
  const [openItemId, setOpenItemId] = useState<string | null>(null)
  const openItem = items.find(item => item.id === openItemId) ?? null

  const close = (refocus: boolean) => {
    restoreFocus.current = refocus ? openItemId : null
    setOpenItemId(null)
  }

  useEffect(() => {
    const shell = shellRef.current

    if (openItemId) {
      const options = [...(shell?.querySelectorAll<HTMLElement>('[role="option"]') ?? [])]
      const selected = options.find(option => option.getAttribute('aria-selected') === 'true') ?? options[0]
      selected?.focus()

      return
    }

    if (restoreFocus.current) {
      shell?.querySelector<HTMLElement>(`[data-notch-trigger="${restoreFocus.current}"]`)?.focus()
      restoreFocus.current = null
    }
  }, [openItemId])

  useEffect(() => {
    if (!openItemId) {
      return
    }

    const onPointerDown = (event: PointerEvent) => {
      if (!shellRef.current?.contains(event.target as Node)) {
        restoreFocus.current = null
        setOpenItemId(null)
      }
    }

    document.addEventListener('pointerdown', onPointerDown)

    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [openItemId])

  const onListKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const options = [...event.currentTarget.querySelectorAll<HTMLElement>('[role="option"]')]
    const current = options.indexOf(document.activeElement as HTMLElement)
    const moves: Record<string, number> = { ArrowDown: current + 1, ArrowUp: current - 1, Home: 0, End: options.length - 1 }

    if (event.key === 'Escape') {
      event.preventDefault()
      close(true)
    } else if (event.key in moves) {
      event.preventDefault()
      options[Math.min(Math.max(moves[event.key], 0), options.length - 1)]?.focus()
    }
  }

  const select = (item: NotchItem, option: NotchOption) => {
    item.onChange(option.id, option)
    close(true)
  }

  const panel = openItem ? (
    <motion.div key={openItem.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="w-fit max-w-full">
      <motion.div
        role="listbox"
        aria-label={openItem.label}
        onKeyDown={onListKeyDown}
        className="pop-scroll pop-list flex flex-col gap-1.5 p-2"
        variants={LIST_VARIANTS}
        initial="hidden"
        animate="visible"
      >
        {openItem.options.map(option => {
          const active = option.id === openItem.value

          return (
            <motion.button
              key={option.id}
              role="option"
              aria-selected={active}
              type="button"
              variants={OPTION_VARIANTS}
              onClick={() => select(openItem, option)}
              className={cn(
                'flex w-full cursor-pointer items-center justify-between gap-6 rounded-lg px-3 py-2 text-left text-xs font-medium whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-ring',
                active ? 'bg-h1 text-ink' : 'text-muted-foreground hover:bg-h1 hover:text-ink focus-visible:bg-h1'
              )}
              style={
                active ? { boxShadow: `inset 1px 0 0 ${accentColor}` } : undefined
              }
            >
              <span className="flex min-w-0 items-center gap-2.5">
                {option.icon ? <span className="flex shrink-0 items-center justify-center">{option.icon}</span> : null}
                <span className="min-w-0">{option.label}</span>
              </span>
              {active ? <span className="size-1.5 shrink-0 rounded-full" style={{ background: accentColor }} /> : null}
            </motion.button>
          )
        })}
      </motion.div>
    </motion.div>
  ) : (
    <motion.div key="gatilhos" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="flex w-fit max-w-full items-center gap-1 p-1">
      {items.map((item, index) => (
        <Fragment key={item.id}>
          {index > 0 ? <NotchDivider /> : null}
          <button
            type="button"
            data-notch-trigger={item.id}
            aria-haspopup="listbox"
            aria-expanded={false}
            title={item.label}
            onClick={() => setOpenItemId(item.id)}
            className="flex min-w-0 cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium whitespace-nowrap text-muted-foreground outline-none transition-colors hover:bg-h1 hover:text-ink focus-visible:ring-2 focus-visible:ring-ring"
          >
            {item.icon ? <span className="flex shrink-0 items-center justify-center">{item.icon}</span> : null}
            <span className="sr-only">{item.label}</span>
            <span className="min-w-0 truncate text-ink">{item.valueLabel ?? item.options.find(option => option.id === item.value)?.label}</span>
          </button>
        </Fragment>
      ))}
    </motion.div>
  )

  return (
    <MotionConfig reducedMotion="user">
      <div className={cn('relative h-10 w-full', className)}>
        <motion.div
          ref={shellRef}
          layout
          initial={{ opacity: 0, y: -8, filter: 'blur(6px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={SHELL_SPRING}
          className={cn(
            'absolute top-0 z-30 flex w-fit max-w-full flex-col overflow-hidden rounded-xl border border-h2 bg-popover shadow-card',
            ALIGN[align]
          )}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {panel}
          </AnimatePresence>
        </motion.div>
      </div>
    </MotionConfig>
  )
}
