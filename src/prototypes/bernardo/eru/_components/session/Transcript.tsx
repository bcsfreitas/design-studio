// The session history: the user's ask boxes and the agent's trails, ported from eru features/transcript/Transcript.tsx.
import { Markdown } from '@/systems/eru/components/markdown';
import { FileImage, FileText, TriangleAlert } from '@/systems/eru/libraries/icons';
import type { AssistantEntry, TranscriptEntry, UserEntry } from '../data/session';
import { Trail } from './Trail';

function AssistantMessage({ entry, startedAt, threaded }: { entry: AssistantEntry; startedAt?: number; threaded: boolean }) {
  return (
    <div className="flex min-w-0 flex-col">
      <Trail
        entry={entry}
        startedAt={startedAt}
        threaded={threaded}
        renderText={text => (
          <Markdown variant="compact" className="on-axis">
            {text}
          </Markdown>
        )}
      />
      {entry.status === 'error' ? (
        <p role="alert" className="mt-2 ml-(--axis) flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-2 py-1.5 text-xs text-destructive">
          <TriangleAlert className="size-3.5 shrink-0" aria-hidden />
          {entry.error ?? 'O turno terminou com erro.'}
        </p>
      ) : null}
    </div>
  );
}

function UserMessage({ entry, threaded }: { entry: UserEntry; threaded: boolean }) {
  const attachments = entry.attachments ?? [];

  return (
    <>
      <div className="ask-box">
        {threaded ? <span aria-hidden className="ask-thread" /> : null}
        <p className="ask-text">{entry.text}</p>
        {attachments.length > 0 ? (
          <ul aria-label="Anexos" className="ask-files">
            {attachments.map(attachment => (
              <li key={attachment.name} className="ask-file" title={attachment.name}>
                {attachment.kind === 'image' ? <FileImage aria-hidden /> : <FileText aria-hidden />}
                <span className="truncate">{attachment.name}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <time className="ask-time">{entry.time}</time>
    </>
  );
}

const streaming = (entry: TranscriptEntry | undefined) => entry?.kind === 'assistant' && entry.status === 'running';

/** Each turn marks whether it is live (`data-live`), which paints its thread gold. */
export function Transcript({ entries, liveSince }: { entries: TranscriptEntry[]; liveSince?: number }) {
  return (
    <ol aria-label="Histórico da sessão" className="turns flex flex-col">
      {entries.map((entry, index) => {
        const next = entries[index + 1];

        if (entry.kind === 'user') {
          return (
            <li key={entry.key} aria-label="Você" className="ask" data-live={streaming(next) ? '' : undefined}>
              <UserMessage entry={entry} threaded={next?.kind === 'assistant'} />
            </li>
          );
        }

        const previous = entries[index - 1];

        return (
          <li key={entry.key} aria-label="Agente" className="reply min-w-0" data-live={streaming(entry) ? '' : undefined}>
            <AssistantMessage entry={entry} threaded={previous?.kind === 'user'} startedAt={streaming(entry) ? liveSince : undefined} />
          </li>
        );
      })}
    </ol>
  );
}
