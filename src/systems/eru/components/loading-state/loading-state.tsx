import { Skeleton } from '../skeleton/skeleton'
import { cn } from '#studio/runtime'

const WIDTHS = ['w-3/4', 'w-1/2', 'w-2/3', 'w-5/6']

export function LoadingState({ label, lines = 2, className }: { label: string; lines?: number; className?: string }) {
  return (
    <div role="status" aria-label={label} className={cn('flex flex-col gap-2', className)}>
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton key={index} className={cn('h-4 motion-reduce:animate-none', WIDTHS[index % WIDTHS.length])} />
      ))}
    </div>
  )
}
