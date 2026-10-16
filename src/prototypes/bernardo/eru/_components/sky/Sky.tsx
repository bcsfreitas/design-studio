// The sky behind the main card, ported from eru features/sky/SkyCanvas.tsx: one canvas that draws the scene the page asks for,
// with the veil around the scene's centre. The loop runs at up to 30 frames a second and stops when the tab is hidden, the
// card is off screen, the motion is paused in eru's settings or the device asks for less motion; then it keeps one frame,
// redrawn on resize and when the colour mode changes. Colours come from the theme's CSS variables on the card.
import { createContext, useContext, useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import { useReducedMotion } from '@/systems/eru/libraries/motion';
import { PROJECTS, SESSIONS } from '../data/workspace';
import { MODEL_PROJECTS, liveBodies, todaySatellites, weekDots } from '../data/inicio';
import { ASTROLABIO, type AstrolabeProps } from './astrolabio';
import { FUNDO_VIVO, type FundoVivoProps } from './fundo-vivo';
import { MAPA, type MapaProps } from './mapa';
import type { Rgb, SkyColors, SkyScene as SceneDefinition } from './sky-scene';

/**
 * 'astrolabio' is Início's astrolabe, 'mapa' the Sessões rings, `{ seal }` the big project seal of a session or project page
 * (null is the star of a session without project), and 'calmo' the card's gradient alone, as on pages without a scene.
 */
export type SkyScene = 'astrolabio' | 'calmo' | 'mapa' | { seal: string | null; working?: boolean };

export interface SkyDataValue {
  astrolabio?: AstrolabeProps;
  mapa?: MapaProps;
}

const SkyDataContext = createContext<SkyDataValue | null>(null);

/** What a page tells its sky: the astrolabe's or the map's data, when it differs from the sample workspace. */
export function SkyData({ children, astrolabio, mapa }: SkyDataValue & { children: ReactNode }) {
  return <SkyDataContext value={{ astrolabio, mapa }}>{children}</SkyDataContext>;
}

export function sampleAstrolabe(now = new Date()): AstrolabeProps {
  return {
    projects: MODEL_PROJECTS.map(project => ({ id: project.id, seal: project.seal })),
    chosen: 'endless-harness',
    hot: null,
    week: weekDots(now),
    bodies: liveBodies(now),
    satellites: todaySatellites(now),
    hotSession: null,
  };
}

export function sampleMapa(now = new Date()): MapaProps {
  const hourOf = (date: Date) => date.getHours() + date.getMinutes() / 60;
  return {
    projects: MODEL_PROJECTS.map(project => ({ id: project.id, seal: project.seal })),
    only: null,
    loose: false,
    dots: SESSIONS.map(session => {
      const last = new Date(now.valueOf() - session.minutesAgo * 60_000);
      const known = PROJECTS.some(project => project.id === session.projectId);
      return { id: session.id, project: known ? session.projectId : null, hour: hourOf(last), days: Math.floor(session.minutesAgo / 1440), working: Boolean(session.working) };
    }),
    hotSession: null,
    hotProject: null,
  };
}

const MAX_PIXEL_RATIO = 2;
const MIN_FRAME_MS = 1000 / 30 - 2;
const SKY_MOTION_KEY = 'eru.movimentoDoFundo';

function readMoving() {
  try {
    return window.localStorage.getItem(SKY_MOTION_KEY) !== 'pausado';
  } catch {
    return true;
  }
}

function readColors(element: Element): SkyColors {
  const css = getComputedStyle(element);
  const rgb = (name: string) => {
    const parts = css.getPropertyValue(name).trim().split(/[\s,]+/).map(Number);
    return (parts.length === 3 && parts.every(Number.isFinite) ? parts : [128, 128, 128]) as unknown as Rgb;
  };
  const dark = element.closest('[data-color-mode]')?.getAttribute('data-color-mode') === 'dark';
  return { light: !dark, ink: rgb('--ink-rgb'), tint: rgb('--tint'), hole: rgb('--sky-hole') };
}

type Declared = { definition: SceneDefinition<never>; props: unknown } | null;

function useDeclared(scene: SkyScene): Declared {
  const data = useContext(SkyDataContext);
  if (scene === 'calmo') return null;
  if (scene === 'astrolabio') return { definition: ASTROLABIO as SceneDefinition<never>, props: data?.astrolabio ?? sampleAstrolabe() };
  if (scene === 'mapa') return { definition: MAPA as SceneDefinition<never>, props: data?.mapa ?? sampleMapa() };
  const props: FundoVivoProps = { seal: scene.seal, working: Boolean(scene.working) };
  return { definition: FUNDO_VIVO as SceneDefinition<never>, props };
}

export function Sky({ scene }: { scene: SkyScene }) {
  const declared = useDeclared(scene);
  const reduce = Boolean(useReducedMotion());
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const definition = declared?.definition ?? null;
  const props = useRef(declared?.props);
  const refresh = useRef<(() => void) | null>(null);
  const key = JSON.stringify(declared?.props ?? null);

  useLayoutEffect(() => {
    props.current = JSON.parse(key) as unknown;
    refresh.current?.();
  }, [key]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    if (!canvas || !host || !definition) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const instance = definition.create();
    const still = reduce || !readMoving();
    let colors = readColors(canvas);
    let width = 0;
    let height = 0;
    let t = 0;
    let last = 0;
    let raf = 0;
    let visible = true;
    let watched: Element[] = [];

    const watcher = new ResizeObserver(() => {
      place();
      if (!raf) paint(0);
    });

    const place = () => {
      const box = canvas.getBoundingClientRect();
      const placed = instance.place(box, props.current as never, host);
      if (placed.center) {
        host.style.setProperty('--sky-x', `${Math.round(placed.center[0] * 10) / 10}%`);
        host.style.setProperty('--sky-y', `${Math.round(placed.center[1] * 10) / 10}%`);
      }
      if (placed.watch.length !== watched.length || placed.watch.some((element, i) => element !== watched[i])) {
        watcher.disconnect();
        watched = placed.watch;
        for (const element of watched) watcher.observe(element);
      }
    };

    const measure = () => {
      const box = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
      width = box.width;
      height = box.height;
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      place();
    };

    const paint = (dt: number) => {
      ctx.clearRect(0, 0, width, height);
      if (width > 0) {
        const now = new Date();
        ctx.lineCap = 'round';
        instance.draw({ ctx, width, height, colors, t, dt, still, hour: now.getHours() + now.getMinutes() / 60 }, props.current as never);
      }
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (last && now - last < MIN_FRAME_MS) return;
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
      last = now;
      t += dt;
      paint(dt);
    };

    const play = () => {
      if (!still && visible && !document.hidden && !raf) {
        last = 0;
        raf = requestAnimationFrame(loop);
      }
    };

    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };

    const resize = new ResizeObserver(() => {
      measure();
      paint(0);
    });

    const sight = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) play();
      else stop();
    });

    const onTheme = () => {
      colors = readColors(canvas);
      if (!raf) paint(0);
    };
    const theme = new MutationObserver(onTheme);
    theme.observe(canvas.closest('[data-color-mode]') ?? document.documentElement, { attributes: true, attributeFilter: ['data-color-mode', 'class', 'style'] });

    const onVisibility = () => {
      if (document.hidden) stop();
      else play();
    };

    refresh.current = () => {
      place();
      if (!raf) paint(0);
    };

    resize.observe(canvas);
    sight.observe(canvas);
    document.addEventListener('visibilitychange', onVisibility);
    measure();
    paint(0);
    play();

    return () => {
      refresh.current = null;
      stop();
      resize.disconnect();
      watcher.disconnect();
      sight.disconnect();
      theme.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      host.style.removeProperty('--sky-x');
      host.style.removeProperty('--sky-y');
    };
  }, [definition, reduce]);

  if (!definition) return null;

  return (
    <>
      <canvas ref={canvasRef} aria-hidden data-ceu={definition.id} className="pointer-events-none absolute inset-0 -z-10 size-full" />
      {definition.veil ? <div aria-hidden className="sky-veil pointer-events-none absolute inset-0 -z-10" /> : null}
    </>
  );
}
