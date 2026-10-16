// The Sessões sky: one ring per project with the sessions as dots, ported from eru features/sky/mapa.ts.
import { MOBILE_BREAKPOINT } from './astrolabio-layout'
import { hourOfDay } from './hour'
import { drawSeal, SEAL_SIDE } from './seal-canvas'
import { flatPen, hourAngle, hourFont, measureColumn, radialGlow, rgba, TAU, twoLayers, type Box, type FlatPen } from './sky-flat'
import type { SkyColors, SkyFrame, SkyScene } from './sky-scene'

export interface MapaProject {
  id: string
  seal: string
}

export interface MapaDot {
  id: string
  project: string | null
  hour: number
  days: number
  working: boolean
}

export interface MapaProps {
  projects: MapaProject[]
  only: MapaProject | null
  loose: boolean
  dots: MapaDot[]
  hotSession: string | null
  hotProject: string | null
}

export const LOOSE = 'sem-projeto'

const DISC = 2.6
const MIN_ROOM = 150
const MAX_R = 140
const ROOM_SHARE = 0.4
const EDGE_R = 90
const RING_STEP = 0.135
const LOOSE_RING = 1.16
const SEAL_ROOM = 16
const SMALL_SEAL = 6.5
const SMALL_HOLE = 8.5
const SMALL_IDLE = 0.62
const BIG_SEAL = 0.5
const BIG_IDLE = 0.4
const BIG_WORKING = 0.62
const BIG_FILL = 0.42
const PHONE_BASE = 0.62
const DRIFT = 0.004
const BODY_SPEED = 1.4
const BODY_ORBIT = 7
const BODY_GLOW = 13
const BODY_GLOW_STOPS: [number, number][] = [
  [0, 0.45],
  [1, 0]
]
const FRESH = 0.85
const AGING = 0.06
const DIMMED = 0.6
const HOURS: [number, string][] = [
  [0, '00'],
  [6, '06'],
  [12, '12'],
  [18, '18']
]

interface Layout {
  radius: number
  cx: number
  cy: number
  phone: boolean
  column: Box | null
}

function ringsOf(props: MapaProps): MapaProject[] {
  if (props.only) return [props.only]
  if (props.loose) return []

  return props.projects
}

const showsLoose = (props: MapaProps) => !props.only

function drawnDots(props: MapaProps) {
  const rings = new Set(ringsOf(props).map(project => project.id))

  return props.dots.filter(dot => (dot.project === null ? showsLoose(props) : rings.has(dot.project)))
}

function litRing(props: MapaProps) {
  const dot = props.dots.find(item => item.id === props.hotSession)
  const lit = props.hotProject ?? (dot ? (dot.project ?? LOOSE) : null)

  if (lit === LOOSE) return showsLoose(props) ? LOOSE : null

  return ringsOf(props).some(project => project.id === lit) ? lit : null
}

function drawDisc(ctx: CanvasRenderingContext2D, pen: FlatPen, L: Layout, width: number, k: number) {
  const { cy, radius: R } = L
  const D = DISC * R
  const { ink, ring, ticks, stroke } = pen

  ctx.beginPath()
  ctx.moveTo(0, cy)
  ctx.lineTo(width, cy)
  stroke(ink(0.06 * k), 1)
  ring(D * 1.3, 1, ink(0.045 * k))
  ring(D, 1, ink(0.08 * k))
  ring(R * 1.44, 1.2, ink(0.2 * k))
  ring(R * 1.3, 1, ink(0.1 * k))
  ticks(R * 1.3, 96, 3, ink(0.16 * k), 1, i => i % 4 !== 0)
  ticks(R * 1.3, 24, 6, ink(0.16 * k), 1)
}

function drawDrift(pen: FlatPen, L: Layout, k: number, drift: number) {
  const R = L.radius
  pen.ring(DISC * R * 0.82, 1, pen.ink(0.1 * k), [0.1, 5], drift)
  pen.beads(R * 1.62, 96, [0.7, 1.2], pen.ink(0.15 * k), drift)
}

function drawClock(ctx: CanvasRenderingContext2D, pen: FlatPen, L: Layout) {
  const R = L.radius
  hourFont(ctx, 9)
  ctx.fillStyle = pen.ink(0.42)

  for (const [hour, label] of HOURS) {
    const [x, y] = pen.at(R * 1.44 + 13, hourAngle(hour))
    ctx.fillText(label, x, y)
  }

  pen.solidDiamond(pen.at(R * 1.3, hourAngle(hourOfDay(new Date()))), 3, pen.ink(0.45))
}

function drawRings(ctx: CanvasRenderingContext2D, pen: FlatPen, L: Layout, props: MapaProps, colors: SkyColors) {
  const { cx, cy, radius: R } = L
  const lit = litRing(props)
  const only = props.only
  const rings = ringsOf(props).map((project, i) => ({ ...project, r: R * (1 - i * RING_STEP) }))
  const looseR = props.loose ? R : R * LOOSE_RING
  const radiusOf = new Map(rings.map(ring => [ring.id, ring.r]))
  const dots = drawnDots(props)
  const hot = dots.some(dot => dot.id === props.hotSession)
  const accent = pen.tint
  const circle = (point: [number, number], r: number, color: string, width: number) => {
    pen.circle(point, r)
    pen.stroke(color, width)
  }

  if (showsLoose(props)) pen.ring(looseR, lit === LOOSE ? 1.2 : 1, lit === LOOSE ? accent(0.6) : pen.ink(0.26), [0.1, 3.2])
  for (const { id, r } of rings) pen.ring(r, id === lit ? 1.2 : 1, id === lit ? accent(0.55) : pen.ink(0.15))

  if (only) {
    const working = dots.some(dot => dot.working)
    ctx.save()
    ctx.globalAlpha = working ? BIG_WORKING : BIG_IDLE
    drawSeal(ctx, only.seal, { x: cx, y: cy, size: R * BIG_SEAL * SEAL_SIDE, color: rgba(working ? colors.tint : colors.ink, 1), fillOpacity: BIG_FILL })
    ctx.restore()
  }

  const placed = dots.map(dot => ({ dot, at: pen.at(dot.project === null ? looseR : (radiusOf.get(dot.project) ?? R), hourAngle(dot.hour)) }))

  for (const { dot, at } of placed) {
    if (dot.working) continue

    if (dot.id === props.hotSession) {
      pen.dot(at, 2.8, accent(1))
      circle(at, 7, accent(0.85), 0.9)
      continue
    }

    pen.dot(at, 1.7, pen.ink((FRESH - AGING * Math.min(7, dot.days)) * (hot ? DIMMED : 1)))
  }

  if (!only && R * RING_STEP >= SEAL_ROOM) {
    for (const { id, seal, r } of rings) {
      const on = id === lit
      pen.clear(() => ctx.arc(cx, cy - r, SMALL_HOLE, 0, TAU))
      ctx.save()
      ctx.globalAlpha = on ? 1 : SMALL_IDLE
      drawSeal(ctx, seal, { x: cx, y: cy - r, size: SMALL_SEAL * SEAL_SIDE, color: rgba(on ? colors.tint : colors.ink, 1) })
      ctx.restore()
    }
  }

  const bodies = placed.filter(({ dot }) => dot.working)

  for (const { dot, at } of bodies) {
    radialGlow(ctx, at, BODY_GLOW, BODY_GLOW_STOPS, accent)
    circle(at, BODY_ORBIT, accent(0.4), 0.8)
    pen.dot(at, 2.8, accent(1))
    if (dot.id === props.hotSession) circle(at, 10.5, accent(0.85), 0.9)
  }

  return bodies.map(({ at }) => at)
}

export const MAPA: SkyScene<MapaProps> = {
  id: 'mapa',
  veil: true,
  create() {
    let layout: Layout | null = null
    const layers = twoLayers()
    let bodies: [number, number][] = []

    return {
      place(canvas, _props, root) {
        const measured = measureColumn(canvas, root)
        const column = measured?.text ?? null
        const W = canvas.width
        const H = canvas.height
        const phone = window.innerWidth < MOBILE_BREAKPOINT
        const colRight = column ? column.x + column.width : W * 0.75
        const room = W - colRight
        const roomy = room > MIN_ROOM
        const radius = phone ? W * 0.22 : roomy ? Math.min(MAX_R, room * ROOM_SHARE) : EDGE_R
        const cx = phone ? W * 0.86 : roomy ? colRight + room * 0.52 : W + radius * 0.3
        const cy = phone ? H * 0.8 : 56 + (H - 56) * 0.42
        layout = { radius, cx, cy, phone, column }

        return { center: [(cx / W) * 100, (cy / H) * 100], watch: measured ? [measured.element] : [] }
      },

      draw(frame: SkyFrame, props) {
        if (!layout) return

        const { colors, width, t } = frame
        const L = layout
        const k = L.phone ? PHONE_BASE : 1
        const center = { cx: L.cx, cy: L.cy, scale: 1 }

        layers(frame, {
          key: [L, colors, props, Math.floor(Date.now() / 60_000)],
          column: L.column,
          still(still) {
            const pen = flatPen(still, center, colors)
            drawDisc(still, pen, L, width, k)

            if (L.phone) {
              drawDrift(pen, L, k, 0)
              bodies = []
            } else {
              drawClock(still, pen, L)
              bodies = drawRings(still, pen, L, props, colors)
            }
          },
          moving(moving) {
            if (L.phone) return
            const pen = flatPen(moving, center, colors)
            const turn = t * BODY_SPEED
            drawDrift(pen, L, k, t * DRIFT)
            for (const [x, y] of bodies) pen.dot([x + BODY_ORBIT * Math.sin(turn), y - BODY_ORBIT * Math.cos(turn)], 1.4, rgba(colors.tint, 1))
          }
        })
      }
    }
  }
}
