// The contract between the sky canvas and a scene, from eru features/sky/sky-scene.ts.
export type Rgb = readonly [number, number, number]

export interface SkyColors {
  light: boolean
  ink: Rgb
  tint: Rgb
  hole: Rgb
}

export interface SkyFrame {
  ctx: CanvasRenderingContext2D
  width: number
  height: number
  colors: SkyColors
  t: number
  dt: number
  still: boolean
  hour: number
}

export interface SkyPlacement {
  center: [number, number] | null
  watch: Element[]
}

export interface SkySceneInstance<P> {
  place(canvas: DOMRect, props: P, root: Element): SkyPlacement
  draw(frame: SkyFrame, props: P): void
}

export interface SkyScene<P> {
  id: string
  veil: boolean
  create(): SkySceneInstance<P>
}
