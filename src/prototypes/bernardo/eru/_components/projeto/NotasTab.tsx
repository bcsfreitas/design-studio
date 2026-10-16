// The Notas tab, ported from eru features/notas (NotasTab, NotePage) and features/editor (SaveStatus): the list of the
// project's notes in .notes/ or the open note. eru edits it in CodeMirror with a live preview; here a plain field that
// saves itself the same way: "Salvando…" while typing, "Salvo" 800 ms after the last key, and the first line is the title.
import { useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from '@module/prototypes';
import { AlertDialog, AlertDialogClose, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogPopup, AlertDialogTitle } from '@/systems/eru/components/alert-dialog';
import { Button } from '@/systems/eru/components/button';
import { ErrorState } from '@/systems/eru/components/error-state';
import { LoadingState } from '@/systems/eru/components/loading-state';
import { ArrowLeft, FilePlus, MessageSquarePlus, Trash2 } from '@/systems/eru/libraries/icons';
import type { Nota } from '../data/projeto';
import { useProjectPage } from './context';
import { EmptyTab } from './parts';

const ROW = 'flex min-h-11 w-full min-w-0 cursor-pointer flex-col gap-0.5 rounded-lg px-2 py-2 text-left transition-colors duration-150 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none';

const QUIET_LINK =
  'inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-md pr-2 text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none md:min-h-8';

export const NEW_NOTE = 'nova';

const titleOf = (texto: string) => texto.split('\n')[0].replace(/^#+\s*/, '').trim();
const fileOf = (titulo: string) =>
  `${titulo
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'sem-titulo'}.md`;
const sizeOf = (texto: string) => {
  const bytes = new TextEncoder().encode(texto).length;
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1).replace('.', ',')} KB`;
};

function NoteRow({ nota }: { nota: Nota }) {
  const { setNote } = useProjectPage();
  const id = useId();
  return (
    <li>
      <button type="button" onClick={() => setNote(nota.nome)} aria-labelledby={`${id}-titulo`} aria-describedby={`${id}-detalhe`} className={ROW}>
        <span id={`${id}-titulo`} className="truncate text-sm font-medium">
          {nota.titulo}
        </span>
        <span id={`${id}-detalhe`} className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
          <span className="shrink-0">{nota.editada}</span>
          <span aria-hidden>·</span>
          <span className="truncate font-mono text-[11.5px]">{nota.nome}</span>
          <span aria-hidden>·</span>
          <span className="shrink-0">{nota.tamanho}</span>
        </span>
      </button>
    </li>
  );
}

function DeleteNote({ nota, onDeleted }: { nota: Nota; onDeleted: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" size="sm" aria-label="Apagar" title="Apagar" onClick={() => setOpen(true)}>
        <Trash2 aria-hidden />
        <span className="max-sm:sr-only">Apagar</span>
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar a nota?</AlertDialogTitle>
            <AlertDialogDescription>“{nota.titulo || nota.nome}” sai de .notes/ e não dá para desfazer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="ghost" />}>Cancelar</AlertDialogClose>
            <Button
              variant="destructive"
              onClick={() => {
                setOpen(false);
                onDeleted();
              }}
            >
              Apagar
            </Button>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </>
  );
}

/** The open note: saves itself after a pause and renames the file when the title changes; a new note becomes a file once its first line has text. */
function NoteEditor({ initial }: { initial: Nota | null }) {
  const { setNote, setNotas } = useProjectPage();
  const navigate = useNavigate();
  const [texto, setTexto] = useState(initial?.texto ?? '');
  const [state, setState] = useState<'' | 'salvando' | 'salvo'>('');
  const [saved, setSaved] = useState<Nota | null>(initial);
  const nome = useRef(initial?.nome ?? null);
  const field = useRef<HTMLTextAreaElement>(null);
  const isNew = useRef(!initial);

  useEffect(() => {
    if (isNew.current) field.current?.focus();
  }, []);

  useEffect(() => {
    if (state !== 'salvando') return;
    const timer = window.setTimeout(() => {
      const titulo = titleOf(texto);
      if (!nome.current && !titulo) {
        setState('');
        return;
      }
      const next: Nota = { nome: titulo ? fileOf(titulo) : nome.current!, titulo: titulo || nome.current!, editada: 'Hoje, agora', tamanho: sizeOf(texto), texto };
      const before = nome.current;
      nome.current = next.nome;
      setSaved(next);
      setNotas(notas => [next, ...notas.filter(nota => nota.nome !== before && nota.nome !== next.nome)]);
      setState('salvo');
    }, 800);
    return () => window.clearTimeout(timer);
  }, [state, texto, setNotas]);

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex min-w-0 items-center gap-2">
        <button type="button" onClick={() => setNote(null)} aria-label="Voltar para Notas" className={QUIET_LINK}>
          <ArrowLeft aria-hidden className="size-4" />
          Notas
        </button>
        <p aria-live="polite" className="mr-auto flex min-h-8 items-center gap-1 text-xs text-muted-foreground">
          {state === 'salvando' ? 'Salvando…' : state === 'salvo' ? 'Salvo' : ''}
        </p>
        {saved ? (
          <>
            <Button variant="ghost" size="sm" aria-label="Usar numa sessão nova" title="Usar numa sessão nova" onClick={() => navigate('Sessão/Nova sessão')}>
              <MessageSquarePlus aria-hidden />
              <span className="max-sm:sr-only">Usar numa sessão nova</span>
            </Button>
            <DeleteNote
              nota={saved}
              onDeleted={() => {
                setNotas(notas => notas.filter(nota => nota.nome !== saved.nome));
                setNote(null);
              }}
            />
          </>
        ) : null}
      </div>
      <textarea
        ref={field}
        aria-label="Texto da nota"
        value={texto}
        placeholder={initial ? undefined : 'O título na primeira linha'}
        onChange={event => {
          setTexto(event.target.value);
          setState('salvando');
        }}
        spellCheck={false}
        className="min-h-80 w-full resize-none bg-transparent pb-24 font-sans text-[15px] leading-[1.7] text-ink outline-none [field-sizing:content] placeholder:text-dim"
      />
    </div>
  );
}

export function NotasTab() {
  const { notas, note, status, retry } = useProjectPage();

  if (status === 'carregando') return <LoadingState label="Carregando as notas" lines={4} />;
  if (status === 'erro') return <ErrorState title="Não foi possível ler as notas do projeto." onRetry={retry} />;

  if (note) {
    const nota = note === NEW_NOTE ? null : (notas.find(item => item.nome === note) ?? null);
    return <NoteEditor key={note} initial={nota} />;
  }

  if (notas.length === 0) return <EmptyTab>Nenhuma nota ainda. Em “Nota nova”, a primeira linha vira o título e o nome do arquivo em .notes/.</EmptyTab>;

  return (
    <ul aria-label="Notas" className="flex flex-col gap-0.5">
      {notas.map(nota => (
        <NoteRow key={nota.nome} nota={nota} />
      ))}
    </ul>
  );
}

/** "Nota nova", the bar's action on Notas: opens a blank note, which becomes a file when its first line has text. */
export function NewNoteAction() {
  const { setNote } = useProjectPage();
  return (
    <Button size="sm" onClick={() => setNote(NEW_NOTE)}>
      <FilePlus aria-hidden />
      Nota nova
    </Button>
  );
}
