// Início's sky, the astrolabe, ported from eru features/sky/astrolabio.ts.
import { measureAstrolabe, MEDALLION_HOLE, RADII, vertexAngle, type AstrolabeLayout } from './astrolabio-layout'
import { hourOfDay } from './hour'
import { around, ceiling, COLUMN_CAP, flatPen, hourAngle, hourFont, PAPER_GLOW, radialGlow, rgba, TAU, twoLayers, type Box, type FlatPen } from './sky-flat'
import type { SkyFrame, SkyScene } from './sky-scene'

export type RunState = 'feito' | 'proximo' | 'depois'

export interface AstrolabeProject {
  id: string
  seal: string
}

export interface AstrolabeWeekSession {
  id: string
  project: string | null
  hour: number
  days: number
  messages: number
}

export interface AstrolabeBody {
  id: string
  project: string | null
  hour: number
  working: boolean
}

export interface AstrolabeSatellite {
  id: string
  hour: number
  state: RunState
}

export interface AstrolabeProps {
  projects: AstrolabeProject[]
  chosen: string | null
  hot: string | null
  week: AstrolabeWeekSession[]
  bodies: AstrolabeBody[]
  satellites: AstrolabeSatellite[]
  hotSession: string | null
}

const GREETING_BLUR = 10
const PHONE_BASE = 0.6
const CORONA_QUIET = 0.4
const GLOW_RADIUS = 62
const GLOW_STOPS: [number, number][] = [
  [0, 0.36],
  [0.5, 0.1],
  [1, 0]
]
const SATELLITE_STACK = 8
const SAW_TURN = 720
const CHAIN_TURN = -900
const RAYS_TURN = 1200
const VERTEX = 3
const VERTEX_GROWTH = 0.5
const DOT = 1.1
const DOT_GROWTH = 6.5
const DOT_MAX = 2.7
const WEEK_DAYS = 7
const LENS_HALF = 410
const LENS_ARCS = 36
const LENS_SAGITTA = 176
const BIG_RINGS: [number, number][] = [
  [430, 0.1],
  [520, 0.07],
  [600, 0.075],
  [760, 0.06],
  [940, 0.05],
  [1160, 0.045]
]
const TANGENT_RING = 430
const NODE_RINGS = [600, 760, 940]
const AXIS_DIAMONDS: [number, number, number][] = [
  [RADII.saw2, 0.6, 3.6],
  [RADII.dbl, 0.6, 4.4],
  [474, 0.4, 3.2],
  [600, 0.32, 3.2],
  [760, 0.26, 2.8]
]
const PILLS = ['00', '06', '12', '18']

function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const RAYS = (() => {
  const rand = rng(31)

  return Array.from({ length: 180 }, () => 5 + Math.pow(rand(), 3) * 80)
})()

const CORONA = (() => {
  const rand = rng(7)

  return Array.from({ length: 260 }, (_, i) => {
    const angle = (i / 260) * TAU + rand() * 0.02
    const length = 3 + Math.pow(rand(), 2.2) * 15

    return { angle, length, alpha: 0.12 + rand() * 0.55 }
  })
})()

const CORONA_GROUPS = (() => {
  const groups = new Map<number, typeof CORONA>()

  for (const ray of CORONA) {
    const tenths = Math.round(ray.alpha * 10)
    groups.set(tenths, [...(groups.get(tenths) ?? []), ray])
  }

  return [...groups]
})()

const inModel = (props: AstrolabeProps, id: string | null) => (id !== null && props.projects.some(project => project.id === id) ? id : null)

const strongProjects = (props: AstrolabeProps) => new Set([inModel(props, props.chosen), inModel(props, props.hot)].filter(id => id !== null))

const inWeek = (session: AstrolabeWeekSession) => session.days >= 0 && session.days < WEEK_DAYS

const burning = (props: AstrolabeProps) => props.bodies.some(body => body.working)

const litSession = (props: AstrolabeProps) =>
  props.hotSession !== null && (props.bodies.some(body => body.id === props.hotSession) || props.week.some(session => session.id === props.hotSession)) ? props.hotSession : null

interface Placed {
  layout: AstrolabeLayout
  column: Box | null
  canvas: { left: number; top: number }
  root: Element
}

function drawSpin(ctx: CanvasRenderingContext2D, pen: FlatPen, L: AstrolabeLayout, t: number) {
  const { ink, stroke, at, segment } = pen
  const turn = (seconds: number) => (t / seconds) * TAU
  const saw = turn(SAW_TURN)
  ctx.beginPath()

  for (let i = 0; i < 48; i++) {
    const angle = (i / 48) * TAU + saw
    ctx.moveTo(...at(RADII.saw[1], angle - 0.04))
    ctx.lineTo(...at(RADII.saw[0], angle))
    ctx.lineTo(...at(RADII.saw[1], angle + 0.04))
  }

  stroke(ink(0.34), 0.6)
  const chain = turn(CHAIN_TURN)
  ctx.beginPath()

  for (let i = 0; i < 12; i++) {
    const [x, y] = at(RADII.chain, ((i + 0.5) / 12) * TAU + chain)
    ctx.moveTo(x + 86 * L.scale, y)
    ctx.arc(x, y, 86 * L.scale, 0, TAU)
  }

  stroke(ink(0.08), 0.6)
  const rays = turn(RAYS_TURN)
  ctx.beginPath()
  RAYS.forEach((length, i) => segment(RADII.dbl + 22, RADII.dbl + 22 + length, (i / 180) * TAU + rays))
  stroke(ink(0.11), 0.5)
}

function drawBackground(ctx: CanvasRenderingContext2D, pen: FlatPen, L: AstrolabeLayout, width: number, height: number) {
  const { cx, cy, scale } = L
  const { ring, ticks, diamond, ink, stroke, at, segment, arc } = pen
  const far = Math.hypot(width, height) * 2

  ctx.beginPath()
  ctx.moveTo(cx - far, cy)
  ctx.lineTo(cx + far, cy)
  ctx.moveTo(cx, cy - far)
  ctx.lineTo(cx, cy + far)
  stroke(ink(0.14), 0.6)

  ctx.beginPath()
  for (const angle of [TAU / 8, (3 * TAU) / 8]) {
    const [x0, y0] = around(cx, cy, far, angle)
    const [x1, y1] = around(cx, cy, far, angle + Math.PI)
    ctx.moveTo(x0, y0)
    ctx.lineTo(x1, y1)
  }
  stroke(ink(0.05), 0.6)

  const tangent = TANGENT_RING * scale
  const tangents = Array.from({ length: 12 }, (_, k) => {
    const angle = (k / 12) * TAU + TAU / 24
    const point = around(cx, cy, tangent, angle)

    return { point, dir: [Math.cos(angle), Math.sin(angle)] as const, strong: k % 2 === 0 }
  })

  for (const strong of [true, false]) {
    ctx.beginPath()

    for (const line of tangents.filter(each => each.strong === strong)) {
      ctx.moveTo(line.point[0] - line.dir[0] * far, line.point[1] - line.dir[1] * far)
      ctx.lineTo(line.point[0] + line.dir[0] * far, line.point[1] + line.dir[1] * far)
    }

    stroke(ink(strong ? 0.075 : 0.05), 0.6)
  }

  const half = LENS_HALF * scale
  ctx.beginPath()

  for (let i = 1; i <= LENS_ARCS; i++) {
    const sagitta = (i / LENS_ARCS) * LENS_SAGITTA * scale
    const r = (half * half + sagitta * sagitta) / (2 * sagitta)
    const spread = Math.asin(Math.min(1, half / r))
    ctx.moveTo(cx - half, cy)
    ctx.arc(cx, cy + r - sagitta, r, -Math.PI / 2 - spread, -Math.PI / 2 + spread)
    ctx.moveTo(cx + half, cy)
    ctx.arc(cx, cy - r + sagitta, r, Math.PI / 2 - spread, Math.PI / 2 + spread)
  }

  stroke(ink(0.055), 0.5)
  diamond([cx - half, cy], 4, ink(0.5))
  diamond([cx + half, cy], 4, ink(0.5))

  for (const [r, alpha] of BIG_RINGS) ring(r, 0.6, ink(alpha))
  ring(474, 0.9, ink(0.14), [0.1, 6])
  ticks(600, 360, 5, ink(0.08), 0.6, i => i % 6 !== 0)
  ticks(600, 60, 12, ink(0.12), 0.6)

  ctx.fillStyle = ink(0.45)
  ctx.beginPath()

  for (const line of tangents) {
    ctx.moveTo(line.point[0] + 1.35, line.point[1])
    ctx.arc(line.point[0], line.point[1], 1.35, 0, TAU)

    for (const r of NODE_RINGS) {
      const reach = Math.sqrt((r * scale) ** 2 - tangent ** 2)

      for (const side of [-1, 1]) {
        const x = line.point[0] + line.dir[0] * reach * side
        const y = line.point[1] + line.dir[1] * reach * side
        ctx.moveTo(x + 1.35, y)
        ctx.arc(x, y, 1.35, 0, TAU)
      }
    }
  }

  ctx.fill()

  ctx.beginPath()
  for (let h = 6; h <= 18.001; h += 0.04) segment(RADII.hatch[0], RADII.hatch[1], hourAngle(h))
  stroke(ink(0.2), 0.5)
  ctx.beginPath()
  arc(RADII.hatch[0], hourAngle(6), hourAngle(18))
  ctx.moveTo(...at(RADII.hatch[1], hourAngle(6)))
  arc(RADII.hatch[1], hourAngle(6), hourAngle(18))
  stroke(ink(0.32), 0.6)
  ctx.fillStyle = ink(0.38)
  ctx.beginPath()

  for (let h = 18.25; h < 30; h += 0.5) {
    const [x, y] = at((RADII.hatch[0] + RADII.hatch[1]) / 2, hourAngle(h))
    ctx.moveTo(x + 0.75, y)
    ctx.arc(x, y, 0.75, 0, TAU)
  }

  ctx.fill()

  ring(RADII.saw[1], 0.6, ink(0.24))
  ring(RADII.saw2, 0.6, ink(0.14))
  ring(RADII.orbit, 0.6, ink(0.16))
  ring(RADII.chain, 0.6, ink(0.07))

  ring(RADII.dbl, 1.5, ink(0.26))
  ring(RADII.dbl + 6, 0.6, ink(0.15))
  ticks(RADII.dbl, 240, -4, ink(0.18), 0.5, i => i % 10 !== 0)
  ticks(RADII.dbl, 24, -12, ink(0.34), 0.6)
  ring(RADII.dbl + 16, 0.9, ink(0.22), [0.1, 3.4])

  for (const [r, alpha, size] of AXIS_DIAMONDS) for (let i = 0; i < 4; i++) diamond(at(r, (i / 4) * TAU), size, ink(alpha))
  for (let i = 0; i < 12; i++) diamond(at(RADII.chain, (i / 12) * TAU), 2.2, ink(0.42), 0.7)

}

function drawWeek(ctx: CanvasRenderingContext2D, pen: FlatPen, L: AstrolabeLayout, props: AstrolabeProps) {
  const { at, ink, tint, dot, stroke } = pen
  const strong = strongProjects(props)
  const lit = litSession(props)
  const size = Math.max(L.scale, 0.6)
  const placed = props.week.filter(inWeek).map(session => ({
    session,
    point: at(RADII.week - session.days * RADII.weekStep, hourAngle(session.hour)),
    r: (DOT + Math.min(DOT_MAX, Math.sqrt(Math.max(0, session.messages)) / DOT_GROWTH)) * size,
    strong: session.project !== null && strong.has(session.project)
  }))
  const fill = (color: string, keep: (each: (typeof placed)[number]) => boolean) => {
    ctx.fillStyle = color
    ctx.beginPath()

    for (const { point, r } of placed.filter(keep)) {
      ctx.moveTo(point[0] + r, point[1])
      ctx.arc(point[0], point[1], r, 0, TAU)
    }

    ctx.fill()
  }

  fill(ink(0.32), each => !each.strong && each.session.id !== lit)
  fill(ink(0.82), each => each.strong && each.session.days > 0 && each.session.id !== lit)
  fill(ink(0.95), each => each.strong && each.session.days === 0 && each.session.id !== lit)

  for (const { session, point, r } of placed) {
    if (session.id !== lit) continue
    ctx.beginPath()
    ctx.arc(point[0], point[1], r + 3.5, 0, TAU)
    stroke(tint(0.78), 0.8)
    dot(point, r, tint(1))
  }
}

function drawDial(ctx: CanvasRenderingContext2D, pen: FlatPen, L: AstrolabeLayout, props: AstrolabeProps, hole: string) {
  const { cx, cy, scale } = L
  const { ring, ticks, beads, dot, ink, tint, stroke, at, segment, arc, clear, solidDiamond } = pen

  ring(RADII.out, 0.6, ink(0.36))
  beads(RADII.beads, 96, [0.6, 1.05], ink(0.44))
  ring(RADII.inner, 0.6, ink(0.3))

  ring(RADII.day, 2, ink(0.9))
  ticks(RADII.day + 7, 96, 3.5, ink(0.22), 0.5, i => i % 4 !== 0)
  ticks(RADII.day + 7, 24, 8, ink(0.5), 0.6, i => i % 6 !== 0)
  ticks(RADII.day + 7, 4, 15, ink(0.9), 1)

  const now = hourAngle(hourOfDay(new Date()))
  ctx.beginPath()
  arc(RADII.prog, 0, now)
  stroke(ink(0.6), 1)
  ctx.beginPath()
  arc(RADII.prog, now, TAU - 0.0001)
  stroke(ink(0.24), 1, [0.1, 3.6])
  ring(RADII.sched, 0.5, ink(0.13))

  for (let i = 0; i < 7; i++) {
    const r = RADII.week - i * RADII.weekStep
    if (i === 0) ring(r, 0.6, ink(0.24))
    else ring(r, 0.9, ink(0.17), [0.1, 3.2])
  }

  ring(RADII.core + 13, 0.5, ink(0.2))
  drawWeek(ctx, pen, L, props)

  const count = props.projects.length
  const chosen = inModel(props, props.chosen)
  const hot = inModel(props, props.hot)
  const ids = props.projects.map(project => project.id)
  const vertices = ids.map((_, i) => at(RADII.day, vertexAngle(i, count)))
  const edges = count < 2 ? [] : count === 2 ? [[0, 1]] : ids.map((_, i) => [i, (i + 1) % count])

  for (const lit of [false, true]) {
    ctx.beginPath()

    for (const [a, b] of edges) {
      if ((ids[a] === chosen || ids[b] === chosen) !== lit) continue
      ctx.moveTo(...vertices[a])
      ctx.lineTo(...vertices[b])
    }

    stroke(lit ? tint(0.42) : ink(0.17), lit ? 0.65 : 0.55)
  }

  ids.forEach((id, i) => {
    const angle = vertexAngle(i, count)
    ctx.beginPath()
    segment(RADII.day + 6, RADII.orbit - 23, angle)
    if (id === chosen) stroke(tint(0.62), 0.8)
    else if (id === hot) stroke(ink(0.5), 0.7)
    else stroke(ink(0.2), 0.6, [1, 3])
  })

  ctx.fillStyle = hole
  ctx.beginPath()
  ctx.arc(cx, cy, RADII.core * scale, 0, TAU)
  ctx.fill()

  for (const [tenths, rays] of CORONA_GROUPS) {
    ctx.beginPath()
    for (const ray of rays) segment(RADII.core + 0.6, RADII.core + ray.length, ray.angle)
    stroke(burning(props) ? tint(tenths / 10) : ink((tenths / 10) * CORONA_QUIET), 0.5)
  }

  ctx.beginPath()
  ctx.arc(cx, cy, RADII.core * scale, 0, TAU)
  stroke(ink(0.95), 1.2)

  vertices.forEach((point, i) => {
    const id = ids[i]
    const sessions = props.week.filter(session => session.project === id && inWeek(session)).length
    const r = (VERTEX + Math.sqrt(sessions) * VERTEX_GROWTH) * Math.max(scale, 0.6)
    const disc = () => ctx.arc(point[0], point[1], r, 0, TAU)

    if (id === chosen || id === hot) {
      ctx.beginPath()
      ctx.arc(point[0], point[1], r + 5, 0, TAU)
      stroke(id === chosen ? tint(0.45) : ink(0.45), 0.6)
    }

    clear(disc)
    ctx.beginPath()
    disc()

    if (id === chosen) {
      stroke(tint(1), 1.2)
      dot(point, 1.9, tint(1))
    } else if (id === hot) {
      stroke(ink(0.95), 1)
      dot(point, 1.6, ink(0.95))
    } else {
      stroke(ink(0.72), 0.8)
    }
  })

  ctx.beginPath()
  segment(RADII.core + 4, RADII.hatch[1] + 4, now)
  stroke(tint(0.92), 1)
  solidDiamond(at(RADII.prog, now), 3.6, tint(1))
  dot(at(RADII.hatch[1] + 4, now), 1.9, tint(1))

  if (scale >= 0.6) {
    hourFont(ctx, 9.5 * Math.max(scale, 0.85))

    PILLS.forEach((label, i) => {
      const [x, y] = at(RADII.out, (i / 4) * TAU)
      const pill = () => ctx.roundRect(x - 14, y - 7.5, 28, 15, 7.5)
      clear(pill)
      ctx.beginPath()
      pill()
      stroke(ink(0.34), 0.7)
      ctx.fillStyle = ink(0.7)
      ctx.fillText(label, x, y + 0.5)
    })
  }

}

function drawGlow(ctx: CanvasRenderingContext2D, { cx, cy, scale }: AstrolabeLayout, tint: (alpha: number) => string, paper: boolean) {
  ctx.save()
  ctx.globalCompositeOperation = 'destination-over'
  radialGlow(ctx, [cx, cy], GLOW_RADIUS * scale, GLOW_STOPS, alpha => tint(alpha * (paper ? PAPER_GLOW : 1)))
  ctx.restore()
}

function drawLive(ctx: CanvasRenderingContext2D, pen: FlatPen, L: AstrolabeLayout, props: AstrolabeProps) {
  const { at, dot, ink, tint, stroke, clear, circle } = pen
  const k = Math.max(L.scale, 0.6)
  const stacked = new Map<number, number>()

  for (const satellite of props.satellites) {
    const minute = Math.round(satellite.hour * 60)
    const level = stacked.get(minute) ?? 0
    stacked.set(minute, level + 1)
    const point = at(RADII.sched + level * SATELLITE_STACK, hourAngle(satellite.hour))

    if (satellite.state === 'proximo') {
      circle(point, 6 * k)
      stroke(tint(0.68), 0.8)
      dot(point, 2.8 * k, tint(1))
    } else if (satellite.state === 'feito') {
      clear(() => ctx.arc(point[0], point[1], 2.1 * k, 0, TAU))
      circle(point, 2.1 * k)
      stroke(ink(0.45), 0.8)
    } else {
      dot(point, 2.3 * k, ink(0.92))
    }
  }

  const hot = litSession(props)

  for (const body of props.bodies) {
    const point = at(RADII.week, hourAngle(body.hour))

    if (body.working) dot(point, 11 * k, tint(0.12))
    circle(point, 6.5 * k)
    stroke(tint(body.working ? 0.78 : 0.45), 0.8)
    dot(point, (body.working ? 3 : 2.2) * k, tint(body.working ? 1 : 0.7))

    if (body.id === hot) {
      circle(point, 10.5 * k)
      stroke(tint(0.6), 0.7)
    }
  }
}

function greetingLines(canvas: { left: number; top: number }, root: Element): Box[] {
  const greeting = root.querySelector('[data-sky-greeting]')

  if (!greeting) return []

  return [...greeting.children].flatMap(line => {
    const range = document.createRange()
    range.selectNodeContents(line)
    const rect = range.getBoundingClientRect()

    return rect.width ? [{ x: rect.left - canvas.left - 8, y: rect.top - canvas.top - 4, width: rect.width + 16, height: rect.height + 8 }] : []
  })
}

function eraseGreeting(ctx: CanvasRenderingContext2D, lines: Box[], spin: boolean) {
  ctx.save()
  ctx.globalCompositeOperation = 'destination-out'

  if (spin) {
    for (const line of lines) ctx.clearRect(line.x - GREETING_BLUR, line.y - GREETING_BLUR, line.width + GREETING_BLUR * 2, line.height + GREETING_BLUR * 2)
  } else {
    ctx.filter = `blur(${GREETING_BLUR}px)`
    ctx.fillStyle = 'rgba(0,0,0,0.85)'
    for (const line of lines) ctx.fillRect(line.x, line.y, line.width, line.height)
  }

  ctx.restore()

  if (!spin) for (const line of lines) ceiling(ctx, line, 1, COLUMN_CAP)
}

function clipBackground(ctx: CanvasRenderingContext2D, L: AstrolabeLayout, width: number, height: number) {
  const out = (RADII.out + 2) * L.scale
  ctx.beginPath()
  ctx.rect(0, 0, width, height)
  ctx.moveTo(L.cx + out, L.cy)
  ctx.arc(L.cx, L.cy, out, 0, TAU)

  if (L.fits) {
    for (const medallion of L.medallions) {
      ctx.moveTo(medallion.x + MEDALLION_HOLE * L.scale, medallion.y)
      ctx.arc(medallion.x, medallion.y, MEDALLION_HOLE * L.scale, 0, TAU)
    }
  }

  ctx.clip('evenodd')
}

export const ASTROLABIO: SkyScene<AstrolabeProps> = {
  id: 'astrolabio',
  veil: true,
  create() {
    let placed: Placed | null = null
    const layers = twoLayers()

    return {
      place(canvas, props, root) {
        const { layout, column, columnBox } = measureAstrolabe(canvas, props.projects.length, root)
        placed = { layout, column: layout.phone ? null : columnBox, canvas: { left: canvas.left, top: canvas.top }, root }

        return { center: [(layout.cx / canvas.width) * 100, (layout.cy / canvas.height) * 100], watch: column ? [column] : [] }
      },

      draw(frame: SkyFrame, props) {
        if (!placed) return

        const { colors, width, height } = frame
        const { layout: L, column } = placed
        const base = L.phone ? PHONE_BASE : 1
        const greeting = L.phone ? greetingLines(placed.canvas, placed.root) : []

        layers(frame, {
          key: [L, greeting, colors, props, Math.floor(Date.now() / 60_000)],
          column,
          still(still) {
            const pen = flatPen(still, L, colors)
            still.save()
            still.globalAlpha = base
            still.save()
            clipBackground(still, L, width, height)
            drawBackground(still, pen, L, width, height)
            still.restore()
            drawDial(still, pen, L, props, rgba(colors.hole, 1))
            drawLive(still, pen, L, props)
            if (burning(props)) drawGlow(still, L, pen.tint, colors.light)
            still.restore()
          },
          moving(spin) {
            spin.save()
            spin.globalAlpha = base
            clipBackground(spin, L, width, height)
            drawSpin(spin, flatPen(spin, L, colors), L, frame.t)
            spin.restore()
          },
          after(layer, moving) {
            if (L.phone) eraseGreeting(layer, greeting, moving)
          }
        })
      }
    }
  }
}
