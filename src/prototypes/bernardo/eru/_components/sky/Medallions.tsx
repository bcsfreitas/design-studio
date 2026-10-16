// The astrolabe's medallions, ported from eru features/home/HomeMedallions.tsx: one button per model project on the dial's
// orbit, over the hole the sky leaves, with the seal, the name and "N sessões · há X". The chosen one is pressed and framed;
// clicking chooses it. Pointer and focus light the project in the sky. Render it in AppShell's `layer`.
import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { SealIcon } from '@/systems/eru/components/seal-icon';
import type { ModelProject } from '../data/inicio';
import { measureAstrolabe, MEDALLION, type AstrolabeLayout } from './astrolabio-layout';
import styles from './medallions.module.css';

const LABEL_WIDTH = 160;
const LABEL_GAP = 8;
const ICON = 20;
const FRAME = 32;

interface Placed {
  layout: AstrolabeLayout;
  width: number;
  colRight: number;
}

function useAstrolabePlace(layer: HTMLElement | null, count: number) {
  const [placed, setPlaced] = useState<Placed | null>(null);

  useLayoutEffect(() => {
    const root = layer?.closest('main');
    if (!layer || !root) return;
    const column = root.querySelector<HTMLElement>('[data-sky-column]');
    const place = () => {
      const card = layer.getBoundingClientRect();
      const { layout, columnBox } = measureAstrolabe(card, count, root);
      setPlaced({ layout, width: card.width, colRight: columnBox ? columnBox.x + columnBox.width : 0 });
    };
    const watcher = new ResizeObserver(place);
    watcher.observe(layer);
    if (column) watcher.observe(column);
    window.addEventListener('resize', place);
    place();
    return () => {
      watcher.disconnect();
      window.removeEventListener('resize', place);
    };
  }, [layer, count]);

  return placed;
}

function useLabelsInside(list: HTMLOListElement | null, placed: Placed | null) {
  useLayoutEffect(() => {
    if (!list || !placed) return;
    const left = placed.colRight + LABEL_GAP;
    const right = placed.width - LABEL_GAP;
    for (const label of list.querySelectorAll<HTMLElement>('[data-medallion-label]')) {
      const x = Number(label.closest<HTMLElement>('[data-x]')?.dataset.x ?? 0);
      const half = label.offsetWidth / 2;
      const push = Math.max(0, left - (x - half));
      const pull = Math.min(0, right - (x + half));
      label.style.translate = `${push + pull}px 0`;
    }
  });
}

export interface MedallionsProps {
  projects: ModelProject[];
  chosen: string | null;
  hot: string | null;
  onHot: (id: string | null) => void;
  onChoose: (id: string) => void;
}

export function Medallions({ projects, chosen, hot, onHot, onChoose }: MedallionsProps) {
  const [layer, setLayer] = useState<HTMLDivElement | null>(null);
  const placed = useAstrolabePlace(layer, projects.length);
  const [list, setList] = useState<HTMLOListElement | null>(null);
  useLabelsInside(list, placed);
  const [hovered, setHovered] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const pressing = useRef(false);

  const mark = (next: { hovered?: string | null; focused?: string | null }) => {
    const h = next.hovered === undefined ? hovered : next.hovered;
    const f = next.focused === undefined ? focused : next.focused;
    if (next.hovered !== undefined) setHovered(h);
    if (next.focused !== undefined) setFocused(f);
    onHot(h ?? f);
  };

  const show = placed?.layout.fits && projects.length > 0;

  return (
    <div ref={setLayer} className="absolute inset-0">
      {show ? (
        <ol ref={setList} aria-label="Projetos no mostrador" className="absolute inset-0">
          {projects.map((project, index) => {
            const place = placed.layout.medallions[index];
            if (!place) return null;
            const scale = placed.layout.scale;
            const style = {
              left: place.x,
              top: place.y,
              '--medallion-scale': scale,
              '--medallion-size': `${MEDALLION * scale}px`,
              '--medallion-frame': `${FRAME * 2 * scale}px`,
              '--medallion-label': `${Math.max(0, Math.min(LABEL_WIDTH, placed.width - placed.colRight - LABEL_GAP * 2))}px`,
            } as CSSProperties;
            return (
              <li key={project.id} className={styles.place} data-x={place.x} style={style}>
                <button
                  type="button"
                  data-project-id={project.id}
                  data-hot={hot === project.id ? '' : undefined}
                  data-top={index === 0 ? '' : undefined}
                  aria-pressed={project.id === chosen}
                  title={project.path}
                  onClick={() => onChoose(project.id)}
                  onPointerEnter={() => mark({ hovered: project.id })}
                  onPointerLeave={() => {
                    pressing.current = false;
                    mark({ hovered: null });
                  }}
                  onPointerDown={() => (pressing.current = true)}
                  onPointerUp={() => (pressing.current = false)}
                  onFocus={() => {
                    mark({ focused: pressing.current ? null : project.id });
                    pressing.current = false;
                  }}
                  onBlur={() => mark({ focused: null })}
                  className={styles.medallion}
                >
                  <svg aria-hidden className={styles.frame} viewBox={`${-FRAME} ${-FRAME} ${FRAME * 2} ${FRAME * 2}`}>
                    <circle r="25" />
                    <path d="M17.68 -17.68 L21.92 -21.92 M17.68 17.68 L21.92 21.92 M-17.68 17.68 L-21.92 21.92 M-17.68 -17.68 L-21.92 -21.92" />
                  </svg>
                  <SealIcon seal={project.seal} size={Math.round(ICON * scale)} tone="inherit" decorative />
                  <span data-medallion-label className={styles.label}>
                    <span className={styles.name}>{project.label}</span>{' '}
                    <span className={styles.count}>
                      {project.sessions} {project.sessions === 1 ? 'sessão' : 'sessões'} · {project.lastActive}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      ) : null}
    </div>
  );
}
