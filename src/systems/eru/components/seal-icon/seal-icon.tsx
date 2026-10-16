import { NO_PROJECT_LABEL, sealById, sealElements, SEAL_VIEW_BOX } from '../../lib/seals/seals'
import { cn } from '#studio/runtime'


interface SealIconProps {
  /** O id do selo no catálogo; null é a sessão sem projeto, desenhada como a estrela de quatro pontas. */
  seal: string | null
  /** Lado em px: 18 nas listas, 24 na barra da sessão, 20 na barra do celular. */
  size?: number
  /** Na cor de destaque enquanto a sessão trabalha; parado, fica na cor apagada. */
  working?: boolean
  /** A cor parada: a apagada, a do texto secundário (barra da sessão) ou a do texto em volta (o Notch, sempre escuro). */
  tone?: 'dim' | 'muted' | 'inherit'
  /** Sem nome acessível, quando o nome do projeto já está ao lado. */
  decorative?: boolean
  className?: string
}

/**
 * O ícone do projeto: o selo plano dele, a moldura e o motivo na grade de 20, com traço de 1 px que não escala. Sem projeto, a
 * estrela de quatro pontas. O nome acessível é o nome do selo ("Losango partido"), ou "Sem projeto".
 */
export function SealIcon({ seal, size = 18, working = false, tone = 'dim', decorative = false, className }: SealIconProps) {
  const info = seal ? sealById(seal) : undefined
  const id = info?.id ?? null
  const a11y = decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': info?.name ?? NO_PROJECT_LABEL }

  return (
    <svg
      {...a11y}
      data-selo={id ?? 'nenhum'}
      data-working={working ? '' : undefined}
      data-tone={tone === 'dim' ? undefined : tone}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      viewBox={SEAL_VIEW_BOX}
      className={cn('seal-icon', className)}
    >
      {sealElements(id).map((element, index) => {
        const paint = element.paint === 'stroke' ? { fill: 'none', stroke: 'currentColor', strokeWidth: 1, vectorEffect: 'non-scaling-stroke' } : { fill: 'currentColor' }

        return element.shape === 'circle' ? <circle key={index} cx={element.cx} cy={element.cy} r={element.r} {...paint} /> : <path key={index} d={element.d} {...paint} />
      })}
    </svg>
  )
}
