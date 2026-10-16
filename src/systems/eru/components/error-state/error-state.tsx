import { CircleAlert, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'

import { Alert, AlertDescription, AlertTitle } from '../alert/alert'
import { Button } from '../button/button'

interface ErrorStateProps {
  title: ReactNode
  description?: ReactNode
  onRetry?: () => void
  tone?: 'error' | 'warning'
  className?: string
}

export function ErrorState({ title, description, onRetry, tone = 'error', className }: ErrorStateProps) {
  const Icon = tone === 'error' ? CircleAlert : TriangleAlert

  return (
    <Alert variant={tone} className={className}>
      <Icon aria-hidden />
      <AlertTitle>{title}</AlertTitle>
      {description || onRetry ? (
        <AlertDescription className="min-w-0 wrap-anywhere">
          {description}
          {onRetry ? (
            <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
              Tentar de novo
            </Button>
          ) : null}
        </AlertDescription>
      ) : null}
    </Alert>
  )
}
