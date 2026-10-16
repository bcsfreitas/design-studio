import { sealElements, SEAL_FRAME, SEAL_GRID, type SealElement } from './seals'

export interface DrawSealOptions {
  /** O centro do selo, nas coordenadas do contexto. */
  x: number
  y: number
  /** O lado do selo, nas mesmas unidades: a grade de 20 cabe nele. */
  size: number
  color: string
  /** As peças cheias ficam com esta opacidade e ganham contorno; abaixo de 1 só no selo grande (os céus), a 15–18 px elas ficam cheias. */
  fillOpacity?: number
  /** Giro no plano, em radianos. */
  rotation?: number
}

/** O lado do selo por raio da moldura (a moldura tem raio 9,4 na grade de 20): `size` de um selo cuja moldura tem `r` px é `r × SEAL_SIDE`. */
export const SEAL_SIDE = SEAL_GRID / (SEAL_FRAME.shape === 'circle' ? SEAL_FRAME.r : SEAL_GRID / 2)

const paths = new WeakMap<SealElement, Path2D>()

function pathOf(element: SealElement) {
  let path = paths.get(element)

  if (!path) {
    if (element.shape === 'path') {
      path = new Path2D(element.d)
    } else {
      path = new Path2D()
      path.arc(element.cx, element.cy, element.r, 0, Math.PI * 2)
    }

    paths.set(element, path)
  }

  return path
}

/**
 * Desenha um selo num canvas a partir do catálogo, com o mesmo desenho do ícone: a moldura e o motivo, ou a estrela quando
 * `seal` é null. Respeita o `globalAlpha` de quem chama.
 */
export function drawSeal(ctx: CanvasRenderingContext2D, seal: string | null, { x, y, size, color, fillOpacity = 1, rotation = 0 }: DrawSealOptions) {
  const scale = size / SEAL_GRID
  const alpha = ctx.globalAlpha

  ctx.save()
  ctx.translate(x, y)

  if (rotation) {
    ctx.rotate(rotation)
  }

  ctx.scale(scale, scale)
  ctx.lineWidth = 1 / scale
  ctx.strokeStyle = color
  ctx.fillStyle = color

  for (const element of sealElements(seal)) {
    const path = pathOf(element)

    if (element.paint === 'stroke') {
      ctx.stroke(path)
      continue
    }

    ctx.globalAlpha = alpha * fillOpacity
    ctx.fill(path)
    ctx.globalAlpha = alpha

    if (fillOpacity < 1) {
      ctx.stroke(path)
    }
  }

  ctx.restore()
}
