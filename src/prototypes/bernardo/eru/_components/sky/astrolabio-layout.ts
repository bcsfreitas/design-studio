// Where the astrolabe and its medallions sit in the card, ported from eru features/sky/astrolabio-layout.ts.
import { around, measureColumn } from './sky-flat'

export const MOBILE_BREAKPOINT = 768

export const RADII = {
  core: 13,
  week: 100,
  weekStep: 10.5,
  day: 112,
  prog: 140,
  sched: 158,
  inner: 176,
  beads: 187,
  out: 198,
  hatch: [208, 222],
  saw: [228, 236],
  saw2: 244,
  orbit: 284,
  chain: 340,
  dbl: 392
} as const

export const MEDALLION = 36
export const MEDALLION_HOLE = 21
export const MIN_ORBIT = 200

const LEFT_REACH = 322
const RIGHT_REACH = 342
const CENTER_TOP = 418
const BOTTOM_REACH = RADII.orbit + 55
const BOTTOM_ROOM = 16
const CENTER_X = 0.75
const NARROW_GAP = 16
const PHONE_DIAL = 96
const PHONE_EDGE = 8
const PHONE_TOP = 24

export interface AstrolabeCard {
  width: number
  height: number
  top: number
  colRight: number
  phone: boolean
}

export interface MedallionPlace {
  x: number
  y: number
  angle: number
}

export interface AstrolabeLayout {
  cx: number
  cy: number
  scale: number
  orbit: number
  medallions: MedallionPlace[]
  fits: boolean
  phone: boolean
}

export const vertexAngle = (index: number, count: number) => (index / Math.max(1, count)) * Math.PI * 2

export function astrolabeLayout({ width, height, top, colRight, phone }: AstrolabeCard, count: number): AstrolabeLayout {
  const place = (cx: number, cy: number, scale: number, fits: boolean): AstrolabeLayout => {
    const orbit = RADII.orbit * scale
    const medallions = Array.from({ length: count }, (_, i) => {
      const angle = vertexAngle(i, count)
      const [x, y] = around(cx, cy, orbit, angle)

      return { x, y, angle }
    })

    return { cx, cy, scale, orbit, medallions, fits, phone }
  }

  if (phone) {
    const dial = Math.min(PHONE_DIAL, width / 4)

    return place(width - dial - PHONE_EDGE, top + dial + PHONE_TOP, dial / RADII.saw2, false)
  }

  const room = width - colRight
  const tall = (height - top - BOTTOM_ROOM) / (CENTER_TOP + BOTTOM_REACH)
  const scale = Math.max(0, Math.min(1, room / (LEFT_REACH + RIGHT_REACH), tall))

  if (scale * RADII.orbit >= MIN_ORBIT) {
    const cx = Math.min(Math.max(width * CENTER_X, colRight + LEFT_REACH * scale), width - RIGHT_REACH * scale)

    return place(cx, top + CENTER_TOP * scale, scale, true)
  }

  const small = Math.min(MIN_ORBIT / RADII.orbit, Math.max(tall, 0.4))
  const dial = RADII.saw2 * small
  const cx = Math.min(colRight + dial + NARROW_GAP, width - dial - NARROW_GAP)

  return place(cx, top + CENTER_TOP * small, small, false)
}

export function measureAstrolabe(origin: DOMRect, count: number, root: Element) {
  const column = measureColumn(origin, root)
  const bar = root.querySelector(':scope > header')
  const top = bar ? bar.getBoundingClientRect().bottom - origin.top : 56
  const colRight = column ? column.border.x + column.border.width : origin.width * 0.5
  const phone = window.innerWidth < MOBILE_BREAKPOINT
  const layout = astrolabeLayout({ width: origin.width, height: origin.height, top, colRight, phone }, count)

  return { layout, column: column?.element ?? null, columnBox: column?.border ?? null }
}
