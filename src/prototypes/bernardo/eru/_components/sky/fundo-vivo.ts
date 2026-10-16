// The sky of a session and a project page: the project's big seal, ported from eru features/sky/fundo-vivo.ts.
import { MOBILE_BREAKPOINT } from './astrolabio-layout'
import { drawSeal, SEAL_SIDE } from './seal-canvas'
import { flatPen, hourAngle, measureColumn, PAPER_GLOW, PAPER_LINE, radialGlow, rgba, twoLayers, type Box, type FlatPen } from './sky-flat'
import type { Rgb, SkyColors, SkyFrame, SkyScene } from './sky-scene'

export interface FundoVivoProps {
  seal: string | null | undefined
  working: boolean
}

const DISC = 2.5
const SEAL_RADIUS = 1.05
const SEAL_ROOM = 0.34
const MIN_ROOM = 230
const SEAL_IDLE = 0.36
const SEAL_WORKING = 0.66
const SEAL_FILL = 0.42
const SEAL_RING = 12
const RING_IDLE = 0.08
const RING_WORKING = 0.22
const GLOW_RADIUS = 1.5
const GLOW_STOPS: [number, number][] = [
  [0, 0.16],
  [0.55, 0.05],
  [1, 0]
]
const IDLE_SPIN = 0.02
const WORKING_SPIN = 0.035
const DRIFT = 0.004
const ACCENT_SECONDS = 0.24
const ACCENT_CURVE = cubicBezier(0.2, 0, 0, 1)

const workingOf = (props: FundoVivoProps) => props.working

interface Layout {
  cx: number
  cy: number
  disc: number
  sealRadius: number
  showSeal: boolean
  phone: boolean
  column: Box | null
}

function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const along = (a: number, b: number, t: number) => 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3

  return (x: number) => {
    if (x <= 0 || x >= 1) return Math.min(1, Math.max(0, x))

    let lo = 0
    let hi = 1

    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2
      if (along(x1, x2, mid) < x) lo = mid
      else hi = mid
    }

    return along(y1, y2, (lo + hi) / 2)
  }
}

const mix = (a: Rgb, b: Rgb, k: number): Rgb => [Math.round(a[0] + (b[0] - a[0]) * k), Math.round(a[1] + (b[1] - a[1]) * k), Math.round(a[2] + (b[2] - a[2]) * k)]

function drawStill(ctx: CanvasRenderingContext2D, pen: FlatPen, L: Layout, width: number, hour: number) {
  const { cx, cy, disc: D } = L
  const { ink, ring, stroke, segment, diamond, at } = pen

  ctx.beginPath()
  ctx.moveTo(0, cy)
  ctx.lineTo(width, cy)
  stroke(ink(0.07), 1)
  ctx.beginPath()
  ctx.moveTo(0, cy - D)
  ctx.lineTo(width, cy - D)
  ctx.moveTo(0, cy + D)
  ctx.lineTo(width, cy + D)
  stroke(ink(0.045), 1)

  ring(D * 3.4, 1, ink(0.045))
  ring(D * 1.8, 1, ink(0.055))
  ring(D * 1.3, 1, ink(0.075))
  ring(D, 1.2, ink(0.26))
  ring(D + 5, 1, ink(0.1))
  ring(D * 0.78, 1, ink(0.08))
  ring(D * 0.5, 1, ink(0.06), [0.1, 2.6])
  ring(D * 0.42, 1, ink(0.07))

  for (const side of [-1, 1]) diamond([cx + side * D, cy], 4, ink(0.3), 0.8, false)

  const angle = hourAngle(hour)
  ctx.beginPath()
  segment(D * 0.42, D - 6, angle)
  stroke(ink(0.1), 1)
  diamond(at(D, angle), 3.4, ink(0.3), 0.8, false)
}

function drawDrift(pen: FlatPen, L: Layout, drift: number) {
  const { disc: D } = L
  const { ink, ring, ticks, beads } = pen

  ring(D * 2.45, 1, ink(0.09), [0.1, 5], drift)
  beads(D * 1.3, 120, [0.7, 1.2], ink(0.2), drift)
  ticks(D, 180, 4, ink(0.13), 1, i => i % 5 !== 0, drift)
  ticks(D, 36, 9, ink(0.13), 1, undefined, drift)
  ring(D * 0.975, 1, ink(0.1), [0.1, 3.4], -drift)
  ticks(D * 0.78, 72, -6, ink(0.08), 1, undefined, -drift * 1.6)
  beads(D * 0.62, 96, [0.8, 1.4], ink(0.2), drift)
}

function drawCenter(ctx: CanvasRenderingContext2D, pen: FlatPen, L: Layout, seal: string | null, colors: SkyColors, accent: number, spin: number) {
  const { cx, cy, sealRadius } = L
  const lineK = colors.light ? PAPER_LINE : 1

  if (accent > 0) {
    const paper = colors.light ? PAPER_GLOW : 1
    radialGlow(ctx, [cx, cy], sealRadius * GLOW_RADIUS, GLOW_STOPS, alpha => rgba(colors.tint, alpha * paper * accent))
  }

  const ringAlpha = RING_IDLE * lineK + (RING_WORKING - RING_IDLE * lineK) * accent
  pen.circle([cx, cy], sealRadius + SEAL_RING)
  pen.stroke(rgba(mix(colors.ink, colors.tint, accent), ringAlpha), 1)

  ctx.save()
  ctx.globalAlpha = SEAL_IDLE + (SEAL_WORKING - SEAL_IDLE) * accent
  drawSeal(ctx, seal, { x: cx, y: cy, size: sealRadius * SEAL_SIDE, color: rgba(mix(colors.ink, colors.tint, accent), 1), fillOpacity: SEAL_FILL, rotation: spin })
  ctx.restore()
}

export const FUNDO_VIVO: SkyScene<FundoVivoProps> = {
  id: 'fundo-vivo',
  veil: true,
  create() {
    let layout: Layout | null = null
    const layers = twoLayers()
    let spin = 0
    let accent = 0
    let accentFrom = 0
    let accentTo = 0
    let accentTime = 1

    return {
      place(canvas, _props, root) {
        const measured = measureColumn(canvas, root)
        const W = canvas.width
        const H = canvas.height
        const phone = window.innerWidth < MOBILE_BREAKPOINT
        const colRight = measured ? measured.border.x + measured.border.width : W * 0.75
        const room = measured ? W - colRight : 999
        const roomy = room > MIN_ROOM
        const radius = phone ? W * 0.2 : Math.min(150, H * 0.16)
        const cx = phone ? W * 0.9 : roomy ? colRight + room * 0.56 : W + radius * 0.5
        const cy = phone ? H * 0.78 : 56 + (H - 56) * 0.6
        layout = {
          cx,
          cy,
          disc: DISC * radius,
          sealRadius: Math.min(SEAL_RADIUS * radius, room * SEAL_ROOM),
          showSeal: !phone && roomy,
          phone,
          column: measured?.border ?? null
        }

        return { center: [(cx / W) * 100, (cy / H) * 100], watch: [measured?.element, root.querySelector('[data-session-toolbar]')].filter(el => el != null) }
      },

      draw(frame: SkyFrame, props) {
        if (!layout) return

        const { colors, width, t, dt } = frame
        const L = layout
        const working = workingOf(props)
        const target = working ? 1 : 0

        if (frame.still) {
          accent = accentFrom = accentTo = target
          accentTime = 1
        } else {
          if (target !== accentTo) {
            accentFrom = accent
            accentTo = target
            accentTime = 0
          }

          accentTime = Math.min(1, accentTime + dt / ACCENT_SECONDS)
          accent = accentFrom + (accentTo - accentFrom) * ACCENT_CURVE(accentTime)
        }

        spin += dt * (working ? WORKING_SPIN : IDLE_SPIN)
        const center = { cx: L.cx, cy: L.cy, scale: 1 }

        layers(frame, {
          key: [L, colors, frame.hour],
          column: L.column,
          still(still) {
            const pen = flatPen(still, center, colors)
            drawStill(still, pen, L, width, frame.hour)
            if (L.phone) drawDrift(pen, L, 0)
          },
          moving(moving) {
            const pen = flatPen(moving, center, colors)
            if (!L.phone) drawDrift(pen, L, t * DRIFT)
            if (L.showSeal && props.seal !== undefined) drawCenter(moving, pen, L, props.seal, colors, accent, spin)
          }
        })
      }
    }
  }
}
