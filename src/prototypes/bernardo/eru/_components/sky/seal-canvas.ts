// eru's lib/seals/seal-canvas.ts.
import { sealElements, SEAL_FRAME, SEAL_GRID, type SealElement } from './seals'

export interface DrawSealOptions {
  x: number
  y: number
  size: number
  color: string
  fillOpacity?: number
  rotation?: number
}

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
