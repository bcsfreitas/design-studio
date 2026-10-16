// Flat drawing primitives shared by the skies, ported from eru features/sky/sky-flat.ts.
import type { Rgb, SkyColors, SkyFrame } from './sky-scene'

export const TAU = Math.PI * 2

export const COLUMN_CAP = 0.08

export const PAPER_LINE = 1.15

export const PAPER_GLOW = 0.45

const COLUMN_FADE = 0.7
const COLUMN_EDGE = 32

export interface Box {
  x: number
  y: number
  width: number
  height: number
}

export interface FlatCenter {
  cx: number
  cy: number
  scale: number
}

export const rgba = ([r, g, b]: Rgb, alpha: number) => `rgba(${r},${g},${b},${Math.round(Math.min(1, alpha) * 10000) / 10000})`

export const hourAngle = (hour: number) => (hour / 24) * TAU

export function around(cx: number, cy: number, r: number, angle: number): [number, number] {
  return [cx + r * Math.sin(angle), cy - r * Math.cos(angle)]
}

export function hourFont(ctx: CanvasRenderingContext2D, size: number) {
  ctx.font = `${size}px 'Geist Mono Variable', ui-monospace, monospace`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0.06em'
}

export function radialGlow(ctx: CanvasRenderingContext2D, [x, y]: [number, number], r: number, stops: readonly (readonly [number, number])[], color: (alpha: number) => string) {
  const glow = ctx.createRadialGradient(x, y, 0, x, y, r)
  for (const [offset, alpha] of stops) glow.addColorStop(offset, color(alpha))
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(x, y, r, 0, TAU)
  ctx.fill()
}

const SVG_NS = 'http://www.w3.org/2000/svg'
const ceilings = new Map<string, string>()

function ceilingFilter(scale: number, top: number) {
  const key = `${scale}:${top}`
  const known = ceilings.get(key)

  if (known && document.getElementById(known)) return known

  const id = `ceu-teto-${ceilings.size}`
  const steps = 100
  const values = Array.from({ length: steps + 1 }, (_, k) => Math.min((k / steps) * scale, top))
  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('aria-hidden', 'true')
  svg.setAttribute('width', '0')
  svg.setAttribute('height', '0')
  svg.style.position = 'absolute'
  svg.innerHTML = `<filter id="${id}" color-interpolation-filters="sRGB"><feComponentTransfer><feFuncA type="table" tableValues="${values.join(' ')}"/></feComponentTransfer></filter>`
  document.body.append(svg)
  ceilings.set(key, id)

  return id
}

let ceilingLayer: HTMLCanvasElement | null = null

export function ceiling(ctx: CanvasRenderingContext2D, box: Box, scale: number, top: number) {
  const canvas = ctx.canvas as HTMLCanvasElement | undefined

  if (!('filter' in ctx) || !(canvas instanceof HTMLCanvasElement)) return false

  const ratio = ctx.getTransform().a || 1
  const x = Math.max(0, Math.floor(box.x * ratio))
  const y = Math.max(0, Math.floor(box.y * ratio))
  const width = Math.min(canvas.width, Math.ceil((box.x + box.width) * ratio)) - x
  const height = Math.min(canvas.height, Math.ceil((box.y + box.height) * ratio)) - y

  if (width <= 0 || height <= 0) return true

  ceilingLayer ??= document.createElement('canvas')

  if (ceilingLayer.width < width) ceilingLayer.width = width
  if (ceilingLayer.height < height) ceilingLayer.height = height

  const layer = ceilingLayer.getContext('2d')

  if (!layer) return false

  layer.clearRect(0, 0, width, height)
  layer.drawImage(canvas, x, y, width, height, 0, 0, width, height)
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(x, y, width, height)
  ctx.filter = `url(#${ceilingFilter(scale, top)})`
  ctx.drawImage(ceilingLayer, 0, 0, width, height, x, y, width, height)
  ctx.restore()

  return true
}

export function flatPen(ctx: CanvasRenderingContext2D, { cx, cy, scale }: FlatCenter, colors: SkyColors) {
  const lineK = colors.light ? PAPER_LINE : 1
  const ink = (alpha: number) => rgba(colors.ink, alpha * lineK)
  const tint = (alpha: number) => rgba(colors.tint, alpha)
  const at = (r: number, angle: number) => around(cx, cy, r * scale, angle)

  const stroke = (color: string, width: number, dash: number[] = []) => {
    ctx.strokeStyle = color
    ctx.lineWidth = width
    ctx.setLineDash(dash)
    ctx.lineCap = dash.length ? 'round' : 'butt'
    ctx.stroke()
  }

  const ring = (r: number, width: number, color: string, dash: number[] = [], turn = 0) => {
    ctx.beginPath()
    ctx.arc(cx, cy, r * scale, turn, turn + TAU)
    stroke(color, width, dash)
  }

  const arc = (r: number, a0: number, a1: number) => ctx.arc(cx, cy, r * scale, a0 - Math.PI / 2, a1 - Math.PI / 2)

  const segment = (r0: number, r1: number, angle: number) => {
    const [x0, y0] = at(r0, angle)
    const [x1, y1] = at(r1, angle)
    ctx.moveTo(x0, y0)
    ctx.lineTo(x1, y1)
  }

  const ticks = (r: number, count: number, length: number, color: string, width: number, keep: (i: number) => boolean = () => true, turn = 0) => {
    ctx.beginPath()
    for (let i = 0; i < count; i++) if (keep(i)) segment(r, r + length, (i / count) * TAU + turn)
    stroke(color, width)
  }

  const beads = (r: number, count: number, sizes: readonly [number, number], color: string, turn = 0) => {
    ctx.fillStyle = color
    ctx.beginPath()

    for (let i = 0; i < count; i++) {
      const [x, y] = at(r, (i / count) * TAU + turn)
      const size = i % 4 ? sizes[0] : sizes[1]
      ctx.moveTo(x + size, y)
      ctx.arc(x, y, size, 0, TAU)
    }

    ctx.fill()
  }

  const circle = ([x, y]: [number, number], r: number) => {
    ctx.beginPath()
    ctx.arc(x, y, r, 0, TAU)
  }

  const dot = ([x, y]: [number, number], r: number, color: string) => {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(x, y, r, 0, TAU)
    ctx.fill()
  }

  const clear = (shape: () => void) => {
    ctx.save()
    ctx.globalCompositeOperation = 'destination-out'
    ctx.fillStyle = '#000'
    ctx.beginPath()
    shape()
    ctx.fill()
    ctx.restore()
  }

  const rhombus = ([x, y]: [number, number], r: number) => () => {
    ctx.moveTo(x, y - r)
    ctx.lineTo(x + r, y)
    ctx.lineTo(x, y + r)
    ctx.lineTo(x - r, y)
    ctx.closePath()
  }

  const diamond = (point: [number, number], r: number, color: string, width = 0.8, hollow = true) => {
    const shape = rhombus(point, r)
    if (hollow) clear(shape)
    ctx.beginPath()
    shape()
    stroke(color, width)
  }

  const solidDiamond = (point: [number, number], r: number, color: string) => {
    ctx.fillStyle = color
    ctx.beginPath()
    rhombus(point, r)()
    ctx.fill()
  }

  return { at, stroke, ring, arc, segment, ticks, beads, circle, dot, clear, diamond, solidDiamond, ink, tint }
}

export type FlatPen = ReturnType<typeof flatPen>

export function measureColumn(origin: DOMRect, root: ParentNode) {
  const element = root.querySelector<HTMLElement>('[data-sky-column]')

  if (!element) return null

  const box = element.getBoundingClientRect()
  const css = getComputedStyle(element)
  const left = box.left + (parseFloat(css.paddingLeft) || 0) - origin.left
  const right = box.right - (parseFloat(css.paddingRight) || 0) - origin.left
  const border: Box = { x: box.left - origin.left, y: 0, width: box.width, height: origin.height }
  const text: Box = { x: left, y: 0, width: Math.max(0, right - left), height: origin.height }

  return { element, border, text }
}

export function dimColumn(ctx: CanvasRenderingContext2D, column: Box, height: number, spin: boolean) {
  const x0 = column.x - COLUMN_EDGE
  const span = column.width + COLUMN_EDGE * 2
  const edge = COLUMN_EDGE / span
  const inside = spin ? 1 : COLUMN_FADE
  const fade = ctx.createLinearGradient(x0, 0, x0 + span, 0)
  fade.addColorStop(0, 'rgba(0,0,0,0)')
  fade.addColorStop(edge, `rgba(0,0,0,${inside})`)
  fade.addColorStop(1 - edge, `rgba(0,0,0,${inside})`)
  fade.addColorStop(1, 'rgba(0,0,0,0)')
  const capped = !spin && ceiling(ctx, column, 1 - COLUMN_FADE, COLUMN_CAP)
  ctx.save()
  ctx.globalCompositeOperation = 'destination-out'
  ctx.fillStyle = fade

  if (capped) {
    ctx.fillRect(x0, 0, COLUMN_EDGE, height)
    ctx.fillRect(column.x + column.width, 0, COLUMN_EDGE, height)
  } else {
    ctx.fillRect(x0, 0, span, height)
  }

  ctx.restore()
}

export function layerOf(previous: CanvasRenderingContext2D | null, width: number, height: number, ratio: number) {
  const ctx = previous ?? document.createElement('canvas').getContext('2d')

  if (!ctx) return null

  const canvas = ctx.canvas as HTMLCanvasElement | undefined
  const w = Math.max(1, Math.round(width * ratio))
  const h = Math.max(1, Math.round(height * ratio))

  if (canvas instanceof HTMLCanvasElement && (canvas.width !== w || canvas.height !== h)) {
    canvas.width = w
    canvas.height = h
  }

  ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
  ctx.clearRect(0, 0, width, height)

  return ctx
}

export interface LayerPass {
  key: unknown[]
  column: Box | null
  still(ctx: CanvasRenderingContext2D): void
  moving(ctx: CanvasRenderingContext2D): void
  after?(ctx: CanvasRenderingContext2D, moving: boolean): void
}

export function twoLayers() {
  let still: CanvasRenderingContext2D | null = null
  let moving: CanvasRenderingContext2D | null = null
  let stillKey = ''

  return (frame: SkyFrame, pass: LayerPass) => {
    const { ctx, width, height } = frame
    const ratio = ctx.getTransform().a || 1
    const key = JSON.stringify([width, height, ratio, pass.column, ...pass.key])
    const finish = (layer: CanvasRenderingContext2D, spin: boolean) => {
      layer.setLineDash([])
      if (pass.column) dimColumn(layer, pass.column, height, spin)
      pass.after?.(layer, spin)
    }

    if (key !== stillKey || !still) {
      still = layerOf(still, width, height, ratio)
      if (!still) return
      stillKey = key
      pass.still(still)
      finish(still, false)
    }

    moving = layerOf(moving, width, height, ratio)
    if (!moving) return
    pass.moving(moving)
    finish(moving, true)

    ctx.drawImage(still.canvas, 0, 0, width, height)
    ctx.drawImage(moving.canvas, 0, 0, width, height)
  }
}
