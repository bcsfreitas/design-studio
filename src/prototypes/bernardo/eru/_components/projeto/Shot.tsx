// A draft's shot or cover. eru reads the real image from the server; here each one is a small drawn mock of the page it
// captured (light page, dark list, orbits…), in the same box: rounded, 16:10, with the faint border.
import { cn } from '#studio/runtime';
import type { ShotLook } from '../data/projeto';

const LOOKS: Record<ShotLook, { bg: string; ink: string; accent: string }> = {
  claro: { bg: '#efe3cf', ink: 'rgb(60 45 30 / 0.28)', accent: '#c98a3c' },
  lista: { bg: '#16171a', ink: 'rgb(230 230 235 / 0.22)', accent: '#e0a458' },
  escuro: { bg: '#111215', ink: 'rgb(230 230 235 / 0.16)', accent: 'rgb(230 230 235 / 0.35)' },
  faixas: { bg: '#1b1c1f', ink: 'rgb(230 230 235 / 0.12)', accent: '#c99a4a' },
  orbita: { bg: '#121416', ink: 'rgb(230 230 235 / 0.5)', accent: '#f1f1f1' },
  noite: { bg: '#141a14', ink: 'rgb(200 220 200 / 0.18)', accent: '#f4d48a' },
  serif: { bg: '#1a211a', ink: 'rgb(220 230 210 / 0.2)', accent: '#e8e2cf' },
  verde: { bg: '#1c231b', ink: 'rgb(210 225 200 / 0.2)', accent: '#c8b26a' },
};

function Lines({ look }: { look: ShotLook }) {
  const { ink, accent } = LOOKS[look];
  switch (look) {
    case 'faixas':
      return (
        <>
          {[18, 46, 74].map(top => (
            <span key={top} className="absolute inset-x-0 h-[18%]" style={{ top: `${top}%`, background: ink }}>
              <span className="absolute top-[30%] left-[4%] h-[40%] w-[22%] rounded-full" style={{ background: accent, opacity: 0.55 }} />
            </span>
          ))}
        </>
      );
    case 'orbita':
      return (
        <>
          {[22, 72].map(left => (
            <span key={left} className="absolute top-1/2 aspect-square h-[78%] -translate-x-1/2 -translate-y-1/2 rounded-full border" style={{ left: `${left}%`, borderColor: ink }}>
              <span className="absolute inset-[22%] rounded-full border" style={{ borderColor: ink }} />
              <span className="absolute top-1/2 left-1/2 size-[10%] -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: accent }} />
            </span>
          ))}
        </>
      );
    case 'noite':
      return (
        <>
          <span className="absolute top-[38%] left-[48%] size-[14%] rounded-full blur-[3px]" style={{ background: accent, opacity: 0.8 }} />
          <span className="absolute inset-x-[10%] bottom-[16%] h-[6%] rounded-full" style={{ background: ink }} />
        </>
      );
    case 'serif':
      return (
        <>
          <span className="absolute top-[34%] left-[8%] font-display text-[9px] leading-none" style={{ color: accent }}>
            Boa noite
          </span>
          <span className="absolute top-[56%] left-[8%] h-[5%] w-[40%] rounded-full" style={{ background: ink }} />
          <span className="absolute top-[20%] right-[8%] aspect-square h-[60%] rounded-full border" style={{ borderColor: ink }} />
        </>
      );
    case 'claro':
      return (
        <>
          <span className="absolute inset-x-0 top-0 h-[10%]" style={{ background: ink, opacity: 0.4 }} />
          <span className="absolute top-[18%] left-[6%] h-[6%] w-[30%] rounded-full" style={{ background: accent, opacity: 0.6 }} />
          <span className="absolute top-[32%] right-[30%] left-[6%] h-[4%] rounded-full" style={{ background: ink }} />
          <span className="absolute top-[46%] left-[30%] h-[40%] w-[40%] rounded-[3px] bg-white/70" />
        </>
      );
    default:
      return (
        <>
          <span className="absolute inset-y-0 left-0 w-[16%]" style={{ background: ink, opacity: 0.6 }} />
          {[16, 30, 44, 58, 72].map(top => (
            <span key={top} className="absolute left-[22%] h-[5%] rounded-full" style={{ top: `${top}%`, width: `${40 + (top % 3) * 12}%`, background: ink }} />
          ))}
          <span className="absolute top-[16%] right-[6%] h-[5%] w-[10%] rounded-full" style={{ background: accent, opacity: 0.7 }} />
        </>
      );
  }
}

export function Shot({ look, alt, className }: { look: ShotLook | undefined; alt: string; className?: string }) {
  if (!look) {
    return <span role="img" aria-label={`${alt} (sem imagem)`} className={cn('flex items-center justify-center overflow-hidden bg-muted text-muted-foreground', className)} />;
  }
  return (
    <span role="img" aria-label={alt} className={cn('relative block overflow-hidden', className)} style={{ background: LOOKS[look].bg }}>
      <Lines look={look} />
    </span>
  );
}
