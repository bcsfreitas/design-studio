import { cn } from '#studio/runtime'

/** O corpo em órbita (Telperion 7.4): o indicador do que está acontecendo agora. Com movimento reduzido, o corpo fica parado. */
export function Orbiter({ className }: { className?: string }) {
  return (
    <svg viewBox="-8 -8 16 16" aria-hidden className={cn('orbiter', className)}>
      <circle r="5.5" className="orbiter-path" />
      <circle r="1.3" className="orbiter-core" />
      <g className="orbiter-arm">
        <circle cx="5.5" r="1.6" className="orbiter-body" />
      </g>
    </svg>
  )
}
