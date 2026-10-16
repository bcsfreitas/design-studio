// eru's flat seals (lib/seals/seals.ts), copied so the sky can draw them on canvas.
export type SealPaint = 'fill' | 'stroke'

export type SealElement = { shape: 'path'; d: string; paint: SealPaint } | { shape: 'circle'; cx: number; cy: number; r: number; paint: SealPaint }

export type SealFamilyId = 'losangos' | 'lentes' | 'aneis' | 'poligonos' | 'horizontes' | 'tacas-e-gotas'

export interface SealFamily {
  id: SealFamilyId
  name: string
}

export interface Seal {
  id: string
  name: string
  family: SealFamilyId
  elements: readonly SealElement[]
}

export const SEAL_VIEW_BOX = '-10 -10 20 20'
export const SEAL_GRID = 20

export const SEAL_FAMILIES: readonly SealFamily[] = [
  { id: 'losangos', name: 'Losangos' },
  { id: 'lentes', name: 'Lentes' },
  { id: 'aneis', name: 'Anéis' },
  { id: 'poligonos', name: 'Polígonos' },
  { id: 'horizontes', name: 'Horizontes' },
  { id: 'tacas-e-gotas', name: 'Taças e gotas' }
]

export const SEAL_FRAME: SealElement = { shape: 'circle', cx: 0, cy: 0, r: 9.4, paint: 'stroke' }

export const NO_PROJECT_LABEL = 'Sem projeto'

export const NO_PROJECT_STAR: readonly SealElement[] = [
  { shape: 'path', d: 'M0 -9.4Q1.3 -1.3 9.4 0Q1.3 1.3 0 9.4Q-1.3 1.3 -9.4 0Q-1.3 -1.3 0 -9.4Z', paint: 'stroke' },
  { shape: 'circle', cx: 0, cy: 0, r: 1, paint: 'fill' }
]

export const SEALS: readonly Seal[] = [
  {
    id: 'losango-partido',
    name: 'Losango partido',
    family: 'losangos',
    elements: [
      { shape: 'path', d: 'M0 -5.4L4.6 -0.8H-4.6Z', paint: 'fill' },
      { shape: 'path', d: 'M-4.6 0.8H4.6L0 5.4Z', paint: 'fill' },
      { shape: 'circle', cx: 0, cy: -7.5, r: 0.95, paint: 'fill' },
      { shape: 'circle', cx: 0, cy: 7.5, r: 0.95, paint: 'fill' }
    ]
  },
  {
    id: 'losango-duplo',
    name: 'Losango duplo',
    family: 'losangos',
    elements: [
      { shape: 'path', d: 'M0 -6.6L6.6 0L0 6.6L-6.6 0Z', paint: 'stroke' },
      { shape: 'path', d: 'M0 -3.4L3.4 0L0 3.4L-3.4 0Z', paint: 'stroke' }
    ]
  },
  {
    id: 'losango-encaixado',
    name: 'Losango encaixado',
    family: 'losangos',
    elements: [
      { shape: 'path', d: 'M0 -6.6L6.6 0L0 6.6L-6.6 0Z', paint: 'stroke' },
      { shape: 'path', d: 'M0 -2.4L2.4 0L0 2.4L-2.4 0Z', paint: 'fill' }
    ]
  },
  {
    id: 'losangos-em-fila',
    name: 'Três losangos',
    family: 'losangos',
    elements: [
      { shape: 'path', d: 'M-5.2 -2L-3.2 0L-5.2 2L-7.2 0Z', paint: 'stroke' },
      { shape: 'path', d: 'M0 -2.7L2.7 0L0 2.7L-2.7 0Z', paint: 'fill' },
      { shape: 'path', d: 'M5.2 -2L7.2 0L5.2 2L3.2 0Z', paint: 'stroke' }
    ]
  },
  {
    id: 'agulha',
    name: 'Agulha',
    family: 'losangos',
    elements: [
      { shape: 'path', d: 'M0 -7.2L3 0L0 7.2L-3 0Z', paint: 'stroke' },
      { shape: 'circle', cx: 0, cy: 0, r: 1.1, paint: 'fill' }
    ]
  },
  {
    id: 'lente-com-ponto',
    name: 'Lente com ponto',
    family: 'lentes',
    elements: [
      { shape: 'path', d: 'M-6.6 0Q0 -6 6.6 0Q0 6 -6.6 0Z', paint: 'stroke' },
      { shape: 'circle', cx: 0, cy: 0, r: 1.5, paint: 'fill' }
    ]
  },
  {
    id: 'lentes-gemeas',
    name: 'Lentes gêmeas',
    family: 'lentes',
    elements: [
      { shape: 'path', d: 'M-5.4 -2.7Q0 -6.3 5.4 -2.7Q0 0.9 -5.4 -2.7Z', paint: 'stroke' },
      { shape: 'path', d: 'M-5.4 2.7Q0 -0.9 5.4 2.7Q0 6.3 -5.4 2.7Z', paint: 'stroke' }
    ]
  },
  {
    id: 'lentes-encadeadas',
    name: 'Lentes encadeadas',
    family: 'lentes',
    elements: [
      { shape: 'path', d: 'M-6.6 0Q-4.4 -3.8 -2.2 0Q-4.4 3.8 -6.6 0Z', paint: 'stroke' },
      { shape: 'path', d: 'M-2.2 0Q0 -3.8 2.2 0Q0 3.8 -2.2 0Z', paint: 'fill' },
      { shape: 'path', d: 'M2.2 0Q4.4 -3.8 6.6 0Q4.4 3.8 2.2 0Z', paint: 'stroke' }
    ]
  },
  {
    id: 'feixe-de-lentes',
    name: 'Feixe de lentes',
    family: 'lentes',
    elements: [
      { shape: 'path', d: 'M-6.8 0Q0 -2.8 6.8 0Q0 2.8 -6.8 0ZM-6.8 0Q0 -7 6.8 0Q0 7 -6.8 0Z', paint: 'stroke' },
      { shape: 'path', d: 'M-6.8 -1.1L-5.7 0L-6.8 1.1L-7.9 0Z', paint: 'fill' },
      { shape: 'path', d: 'M6.8 -1.1L7.9 0L6.8 1.1L5.7 0Z', paint: 'fill' }
    ]
  },
  {
    id: 'lente-no-anel',
    name: 'Lente no anel',
    family: 'lentes',
    elements: [
      { shape: 'circle', cx: 0, cy: 0, r: 5.4, paint: 'stroke' },
      { shape: 'path', d: 'M-3.4 0Q0 -3 3.4 0Q0 3 -3.4 0Z', paint: 'fill' }
    ]
  },
  {
    id: 'alvo',
    name: 'Alvo',
    family: 'aneis',
    elements: [
      { shape: 'circle', cx: 0, cy: 0, r: 5.4, paint: 'stroke' },
      { shape: 'circle', cx: 0, cy: 0, r: 2, paint: 'fill' },
      { shape: 'path', d: 'M4.7 -4.7L6.1 -6.1M4.7 4.7L6.1 6.1M-4.7 4.7L-6.1 6.1M-4.7 -4.7L-6.1 -6.1', paint: 'stroke' }
    ]
  },
  {
    id: 'contas',
    name: 'Contas',
    family: 'aneis',
    elements: [
      { shape: 'circle', cx: 0, cy: -5.8, r: 0.95, paint: 'fill' },
      { shape: 'circle', cx: 4.1, cy: -4.1, r: 0.95, paint: 'fill' },
      { shape: 'circle', cx: 5.8, cy: 0, r: 0.95, paint: 'fill' },
      { shape: 'circle', cx: 4.1, cy: 4.1, r: 0.95, paint: 'fill' },
      { shape: 'circle', cx: 0, cy: 5.8, r: 0.95, paint: 'fill' },
      { shape: 'circle', cx: -4.1, cy: 4.1, r: 0.95, paint: 'fill' },
      { shape: 'circle', cx: -5.8, cy: 0, r: 0.95, paint: 'fill' },
      { shape: 'circle', cx: -4.1, cy: -4.1, r: 0.95, paint: 'fill' },
      { shape: 'circle', cx: 0, cy: 0, r: 2.6, paint: 'stroke' }
    ]
  },
  {
    id: 'anel-duplo',
    name: 'Anel duplo',
    family: 'aneis',
    elements: [
      { shape: 'circle', cx: 0, cy: 0, r: 6.6, paint: 'stroke' },
      { shape: 'circle', cx: 0, cy: 0, r: 4, paint: 'stroke' }
    ]
  },
  {
    id: 'regua',
    name: 'Régua',
    family: 'aneis',
    elements: [
      { shape: 'path', d: 'M0 -4.9L0 -7M1.88 -4.53L2.68 -6.47M3.46 -3.46L4.95 -4.95M4.53 -1.88L6.47 -2.68M4.9 0L7 0M4.53 1.88L6.47 2.68M3.46 3.46L4.95 4.95M1.88 4.53L2.68 6.47M0 4.9L0 7M-1.88 4.53L-2.68 6.47M-3.46 3.46L-4.95 4.95M-4.53 1.88L-6.47 2.68M-4.9 0L-7 0M-4.53 -1.88L-6.47 -2.68M-3.46 -3.46L-4.95 -4.95M-1.88 -4.53L-2.68 -6.47', paint: 'stroke' },
      { shape: 'circle', cx: 0, cy: 0, r: 3, paint: 'stroke' }
    ]
  },
  {
    id: 'anel-com-fechos',
    name: 'Anel com fechos',
    family: 'aneis',
    elements: [
      { shape: 'circle', cx: 0, cy: 0, r: 5.4, paint: 'stroke' },
      { shape: 'path', d: 'M-5.4 -2L-3.4 0L-5.4 2L-7.4 0Z', paint: 'fill' },
      { shape: 'path', d: 'M5.4 -2L7.4 0L5.4 2L3.4 0Z', paint: 'fill' }
    ]
  },
  {
    id: 'hexagono',
    name: 'Hexágono',
    family: 'poligonos',
    elements: [
      { shape: 'path', d: 'M6.2 0L3.1 5.37L-3.1 5.37L-6.2 0L-3.1 -5.37L3.1 -5.37Z', paint: 'stroke' },
      { shape: 'circle', cx: 0, cy: 0, r: 1.4, paint: 'fill' }
    ]
  },
  {
    id: 'octogono',
    name: 'Octógono',
    family: 'poligonos',
    elements: [
      { shape: 'path', d: 'M2.53 -6.1L6.1 -2.53L6.1 2.53L2.53 6.1L-2.53 6.1L-6.1 2.53L-6.1 -2.53L-2.53 -6.1Z', paint: 'stroke' },
      { shape: 'path', d: 'M-2.2 -2.2L2.2 -2.2L2.2 2.2L-2.2 2.2Z', paint: 'stroke' }
    ]
  },
  {
    id: 'quadrado',
    name: 'Quadrado',
    family: 'poligonos',
    elements: [
      { shape: 'path', d: 'M-4.7 -4.7L4.7 -4.7L4.7 4.7L-4.7 4.7Z', paint: 'stroke' },
      { shape: 'path', d: 'M-1.3 -1.3L1.3 -1.3L1.3 1.3L-1.3 1.3Z', paint: 'fill' }
    ]
  },
  {
    id: 'pentagono',
    name: 'Pentágono',
    family: 'poligonos',
    elements: [
      { shape: 'path', d: 'M0 -6L5.99 -1.65L3.7 5.4L-3.7 5.4L-5.99 -1.65Z', paint: 'stroke' },
      { shape: 'circle', cx: 0, cy: 0.3, r: 2.2, paint: 'stroke' }
    ]
  },
  {
    id: 'serra',
    name: 'Serra',
    family: 'poligonos',
    elements: [
      { shape: 'path', d: 'M-6 -2.6H6M-6 2.6H6M-6 2.6L-4.5 -2.6L-3 2.6L-1.5 -2.6L0 2.6L1.5 -2.6L3 2.6L4.5 -2.6L6 2.6', paint: 'stroke' }
    ]
  },
  {
    id: 'horizonte',
    name: 'Horizonte',
    family: 'horizontes',
    elements: [
      { shape: 'path', d: 'M-6.8 2.2H6.8M-4.6 2.2A4.6 4.6 0 0 1 4.6 2.2', paint: 'stroke' },
      { shape: 'circle', cx: 0, cy: -4.4, r: 0.95, paint: 'fill' }
    ]
  },
  {
    id: 'aurora',
    name: 'Aurora',
    family: 'horizontes',
    elements: [
      { shape: 'path', d: 'M-7 3H7M-5.6 3A5.6 5.6 0 0 1 5.6 3', paint: 'stroke' },
      { shape: 'path', d: 'M-2.2 3A2.2 2.2 0 0 1 2.2 3Z', paint: 'fill' }
    ]
  },
  {
    id: 'arco-de-contas',
    name: 'Arco de contas',
    family: 'horizontes',
    elements: [
      { shape: 'path', d: 'M-7 2.6H7', paint: 'stroke' },
      { shape: 'circle', cx: 5.14, cy: 0.93, r: 0.95, paint: 'fill' },
      { shape: 'circle', cx: 3.17, cy: -1.77, r: 0.95, paint: 'fill' },
      { shape: 'circle', cx: 0, cy: -2.8, r: 0.95, paint: 'fill' },
      { shape: 'circle', cx: -3.17, cy: -1.77, r: 0.95, paint: 'fill' },
      { shape: 'circle', cx: -5.14, cy: 0.93, r: 0.95, paint: 'fill' }
    ]
  },
  {
    id: 'horizonte-curvo',
    name: 'Horizonte curvo',
    family: 'horizontes',
    elements: [
      { shape: 'path', d: 'M-6.8 4.87A12.2 12.2 0 0 1 6.8 4.87M-7.6 3.01A14.2 14.2 0 0 1 7.6 3.01', paint: 'stroke' },
      { shape: 'circle', cx: 3.6, cy: -3.8, r: 1.2, paint: 'fill' }
    ]
  },
  {
    id: 'colinas',
    name: 'Colinas',
    family: 'horizontes',
    elements: [
      { shape: 'path', d: 'M-7 3H7M-6.2 3A3.4 3.4 0 0 1 0.6 3M0.6 3A2.6 2.6 0 0 1 5.8 3', paint: 'stroke' },
      { shape: 'circle', cx: 3.8, cy: -3.9, r: 1, paint: 'fill' }
    ]
  },
  {
    id: 'taca',
    name: 'Taça',
    family: 'tacas-e-gotas',
    elements: [
      { shape: 'path', d: 'M-5 -4V0.2A5 5 0 0 0 5 0.2V-4', paint: 'stroke' },
      { shape: 'path', d: 'M-2.6 1.4A2.6 2.6 0 0 0 2.6 1.4Z', paint: 'fill' }
    ]
  },
  {
    id: 'taca-dupla',
    name: 'Taça dupla',
    family: 'tacas-e-gotas',
    elements: [
      { shape: 'path', d: 'M-5.4 -4.2V0A5.4 5.4 0 0 0 5.4 0V-4.2M-2.6 -4.2V0A2.6 2.6 0 0 0 2.6 0V-4.2', paint: 'stroke' }
    ]
  },
  {
    id: 'gota',
    name: 'Gota',
    family: 'tacas-e-gotas',
    elements: [
      { shape: 'path', d: 'M0 -6.6L3.49 -0.35A4 4 0 1 1 -3.49 -0.35Z', paint: 'stroke' },
      { shape: 'circle', cx: 0, cy: 1.6, r: 1.1, paint: 'fill' }
    ]
  },
  {
    id: 'gota-no-anel',
    name: 'Gota no anel',
    family: 'tacas-e-gotas',
    elements: [
      { shape: 'circle', cx: 0, cy: 0, r: 5.6, paint: 'stroke' },
      { shape: 'path', d: 'M0 -3.6L1.86 -0.08A2.1 2.1 0 1 1 -1.86 -0.08Z', paint: 'fill' }
    ]
  },
  {
    id: 'tres-gotas',
    name: 'Três gotas',
    family: 'tacas-e-gotas',
    elements: [
      { shape: 'path', d: 'M-4.6 -3L-3.14 0.24A1.6 1.6 0 1 1 -6.06 0.24Z', paint: 'fill' },
      { shape: 'path', d: 'M0 -3L1.46 0.24A1.6 1.6 0 1 1 -1.46 0.24Z', paint: 'fill' },
      { shape: 'path', d: 'M4.6 -3L6.06 0.24A1.6 1.6 0 1 1 3.14 0.24Z', paint: 'fill' }
    ]
  }
]

const BY_ID = new Map(SEALS.map(seal => [seal.id, seal]))

export function sealById(id: string) {
  return BY_ID.get(id)
}

export function sealElements(id: string | null): readonly SealElement[] {
  const seal = id ? BY_ID.get(id) : undefined

  return seal ? [SEAL_FRAME, ...seal.elements] : NO_PROJECT_STAR
}
