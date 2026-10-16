// The sky behind the main card. Placeholder until the sky canvas is ported: it draws nothing over the card's gradient.
export type SkyScene = 'astrolabio' | 'calmo' | { seal: string };

export function Sky(_props: { scene: SkyScene }) {
  return null;
}
