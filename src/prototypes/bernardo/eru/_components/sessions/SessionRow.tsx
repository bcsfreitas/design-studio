// The session row of every list, from eru features/sessions/SessionRow. The full row has the project's seal, the title,
// the last reply or the live state below it, and on the right the age, the project and the origin. The compact row, in
// the recent sessions panel, has only the title and the age.
import type { ReactNode } from 'react';
import { Link } from '@module/prototypes';
import { Orbiter } from '@/systems/eru/components/orbiter';
import { SealIcon } from '@/systems/eru/components/seal-icon';
import { Shine } from '@/systems/eru/components/shine';
import { MessageCircleQuestionMark } from '@/systems/eru/libraries/icons';
import { projectById } from '../data/workspace';
import { sessionLabel, sessionOrigin, shortAge, type ListedSession } from '../data/sessions';
import styles from './session-list.module.css';

export type LiveState = 'working' | 'waiting' | null;

export const liveState = (session: ListedSession): LiveState => (session.waiting ? 'waiting' : session.working ? 'working' : null);

function Snippet({ text }: { text: string }) {
  return <span className={styles.prev}>{text.split(/>>>(.*?)<<</g).map((piece, index) => (index % 2 === 1 ? <mark key={index}>{piece}</mark> : piece))}</span>;
}

function StateLine({ state }: { state: Exclude<LiveState, null> }) {
  return state === 'waiting' ? (
    <span className={styles.waiting}>
      <MessageCircleQuestionMark aria-hidden className="size-3.5 shrink-0" />
      <span className="truncate">Esperando sua resposta</span>
    </span>
  ) : (
    <span className={styles.live}>
      <Orbiter className="size-3.5" />
      <Shine text="Respondendo…" />
    </span>
  );
}

export function SessionRow({ session, snippet, hideProject, actions }: { session: ListedSession; snippet?: string; hideProject?: boolean; actions?: ReactNode }) {
  const label = sessionLabel(session);
  const live = liveState(session);
  const working = live === 'working';
  const project = projectById(session.projectId);
  const named = hideProject ? null : project;
  const origin = sessionOrigin(session.source);
  const reply = session.title.trim() ? session.preview.trim() : '';

  return (
    <li aria-label={label} data-session-id={session.id} data-working={working ? '' : undefined} className={`${styles.row} group/row`}>
      <Link to="Sessão/Sessão" title={label} className={styles.link}>
        <span className={styles.glyph}>
          <SealIcon seal={project?.seal ?? null} working={working} />
        </span>
        <span className={styles.main}>
          <span className={styles.title}>
            {label}
            {working ? <span className="sr-only">, em andamento</span> : null}
          </span>
          {live ? <StateLine state={live} /> : snippet ? <Snippet text={snippet} /> : reply ? <span className={styles.prev}>{reply}</span> : null}
        </span>
        <span className={styles.meta}>
          <span className={styles.age}>{working ? 'agora' : shortAge(session.minutesAgo)}</span>
          {named || origin ? (
            <span className={styles.where}>
              {named ? <span className={styles.proj}>{named.label}</span> : null}
              {origin ? <span className={styles.origin}>{origin}</span> : null}
            </span>
          ) : null}
        </span>
      </Link>
      {actions ? <div className={styles.more}>{actions}</div> : null}
    </li>
  );
}

export function CompactRow({ session, current = false, meta }: { session: ListedSession; current?: boolean; meta?: ReactNode }) {
  const label = sessionLabel(session);

  return (
    <li>
      <Link to="Sessão/Sessão" title={label} aria-current={current ? 'page' : undefined} className={styles.spRow}>
        <span className={styles.spLine}>
          <span className={styles.spTitle}>{label}</span>
          <span aria-hidden className={styles.spAge}>
            {session.working ? 'agora' : shortAge(session.minutesAgo)}
          </span>
        </span>
        {meta ? <span>{meta}</span> : null}
      </Link>
    </li>
  );
}
