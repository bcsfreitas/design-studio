// The Arquivos pages, from eru features/files (FilesPage, FolderView, PathTrail, FilePreview, TextEditor, FolderActions):
// a folder listed with the way up, a file previewed beside its folder, the editor for text files, new folders and uploads.
// Navigation inside the server's folders works locally, starting at `initialPath`.
import { Fragment, useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import { Link } from '@module/prototypes';
import { cn } from '#studio/runtime';
import { AlertDialog, AlertDialogClose, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogPopup, AlertDialogTitle } from '@/systems/eru/components/alert-dialog';
import { Badge } from '@/systems/eru/components/badge';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/systems/eru/components/breadcrumb';
import { Button } from '@/systems/eru/components/button';
import { CodeBlock } from '@/systems/eru/components/code-block';
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from '@/systems/eru/components/dialog';
import { ErrorState } from '@/systems/eru/components/error-state';
import { Input } from '@/systems/eru/components/input';
import { Label } from '@/systems/eru/components/label';
import { Markdown } from '@/systems/eru/components/markdown';
import { Progress } from '@/systems/eru/components/progress';
import { Skeleton } from '@/systems/eru/components/skeleton';
import { Textarea } from '@/systems/eru/components/textarea';
import { ArrowUp, Check, Download, File, FileCode, FileImage, FileText, Folder, FolderPlus, HardDrive, LoaderCircle, Pencil, Upload, X } from '@/systems/eru/libraries/icons';
import AppShell, { PAGE_COLUMN, PageBar } from '../shell/AppShell';
import { PageBarAction } from '../shell/PageBarAction';
import { FILE_TEXT } from '../data/file-text';
import { HOME, LISTINGS, baseName, formatBytes, parentPath, pathSegments, type FileEntry } from '../data/files';

const CODE_EXTENSIONS = /\.(c|cpp|css|go|h|hpp|html|java|js|jsx|json|kt|lua|mjs|py|rb|rs|sh|sql|toml|ts|tsx|xml|ya?ml|zsh)$/i;

function EntryIcon({ entry }: { entry: FileEntry }) {
  const className = 'size-4 shrink-0 text-muted-foreground';
  if (entry.is_directory) return <Folder className={cn(className, 'fill-current/15')} aria-hidden />;
  if (/\.(png|jpe?g|gif|webp|svg)$/i.test(entry.name)) return <FileImage className={className} aria-hidden />;
  if (CODE_EXTENSIONS.test(entry.name)) return <FileCode className={className} aria-hidden />;
  if (/\.(md|txt|log)$/i.test(entry.name)) return <FileText className={className} aria-hidden />;
  return <File className={className} aria-hidden />;
}

const rowClass = 'flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-md px-2 text-left text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring sm:min-h-9';

function FolderView({ path, entries, selected, onOpen, className }: { path: string; entries: FileEntry[]; selected?: string; onOpen: (path: string) => void; className?: string }) {
  return (
    <div className={cn('flex min-h-0 flex-col', className)}>
      {path !== '/' ? (
        <button type="button" aria-label="Voltar para a pasta de cima" className={cn(rowClass, 'text-muted-foreground hover:text-foreground')} onClick={() => onOpen(parentPath(path))}>
          <ArrowUp className="size-4" aria-hidden />
          <span>..</span>
        </button>
      ) : null}
      {entries.length === 0 ? <p className="px-2 py-6 text-sm text-muted-foreground">Pasta vazia.</p> : null}
      <ul aria-label={`Conteúdo de ${path}`} className="flex flex-col">
        {entries.map(entry => (
          <li key={entry.path}>
            <button type="button" aria-current={entry.path === selected ? 'page' : undefined} className={cn(rowClass, entry.path === selected && 'bg-muted font-medium')} onClick={() => onOpen(entry.path)}>
              <EntryIcon entry={entry} />
              <span className="min-w-0 flex-1 truncate">{entry.name}</span>
              {entry.size !== null ? <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{formatBytes(entry.size)}</span> : null}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PathTrail({ path, onOpen }: { path: string; onOpen: (path: string) => void }) {
  const segments = pathSegments(path);
  const list = useRef<HTMLOListElement>(null);

  useEffect(() => {
    if (list.current) list.current.scrollLeft = list.current.scrollWidth;
  }, [path]);

  return (
    <Breadcrumb aria-label="Caminho atual" className="min-w-0">
      <BreadcrumbList ref={list} className="-my-3 -ml-4 scroll-pl-4 flex-nowrap overflow-x-auto pt-3 pb-4 pl-4 sm:m-0 sm:flex-wrap sm:overflow-visible sm:p-0">
        <BreadcrumbItem className="shrink-0">
          {segments.length === 0 ? (
            <BreadcrumbPage>
              <HardDrive className="size-4" aria-hidden />
              <span className="sr-only">Raiz</span>
            </BreadcrumbPage>
          ) : (
            <BreadcrumbLink render={<button type="button" className="cursor-pointer" onClick={() => onOpen('/')} />}>
              <HardDrive className="size-4" aria-hidden />
              <span className="sr-only">Raiz</span>
            </BreadcrumbLink>
          )}
        </BreadcrumbItem>
        {segments.map((segment, index) => (
          <Fragment key={segment.path}>
            <BreadcrumbSeparator className="pointer-events-none shrink-0" />
            <BreadcrumbItem className="shrink-0">
              {index === segments.length - 1 ? (
                <BreadcrumbPage className="max-w-[16rem] truncate">{segment.name}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink render={<button type="button" className="max-w-[12rem] cursor-pointer" onClick={() => onOpen(segment.path)} />}>
                  <span className="block truncate">{segment.name}</span>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

function languageOf(name: string) {
  if (/\.md$/i.test(name)) return 'markdown';
  if (/\.json$/i.test(name)) return 'json';
  if (/\.(ts|tsx)$/i.test(name)) return 'typescript';
  if (/\.py$/i.test(name)) return 'python';
  if (/\.(sh|bashrc|profile|bash_logout)$/i.test(name)) return 'bash';
  return 'text';
}

function TextEditor({ entry, original, onSave, onClose }: { entry: FileEntry; original: string; onSave: (text: string) => void; onClose: () => void }) {
  const [draft, setDraft] = useState(original);
  const [asking, setAsking] = useState(false);
  const [saving, setSaving] = useState(false);
  const dirty = draft !== original;

  const submit = () => {
    if (!dirty || saving) return;
    setSaving(true);
    window.setTimeout(() => {
      onSave(draft);
      onClose();
    }, 600);
  };

  const shortcut = (event: KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      submit();
    }
  };

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {dirty ? 'Alterações não salvas.' : 'Sem alterações.'}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" className="min-h-11 sm:min-h-8" onClick={() => (dirty ? setAsking(true) : onClose())} disabled={saving}>
            Cancelar
          </Button>
          <Button className="min-h-11 sm:min-h-8" onClick={submit} disabled={!dirty || saving}>
            {saving ? 'Salvando…' : 'Salvar'}
          </Button>
        </div>
      </div>
      <Textarea
        aria-label={`Conteúdo de ${entry.name}`}
        value={draft}
        onChange={event => setDraft(event.target.value)}
        onKeyDown={shortcut}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        className="font-mono text-sm [&_textarea]:h-[65svh] [&_textarea]:resize-y [&_textarea]:[field-sizing:fixed]"
      />
      <AlertDialog open={asking} onOpenChange={setAsking}>
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar as alterações?</AlertDialogTitle>
            <AlertDialogDescription>As mudanças em {entry.name} ainda não foram salvas e vão se perder.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="ghost" />}>Continuar editando</AlertDialogClose>
            <AlertDialogClose render={<Button variant="destructive" />} onClick={onClose}>
              Descartar
            </AlertDialogClose>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </div>
  );
}

function TextPreview({ entry, editing, onEditingChange }: { entry: FileEntry; editing: boolean; onEditingChange: (editing: boolean) => void }) {
  const [text, setText] = useState(() => FILE_TEXT[entry.path] ?? `# ${entry.name}\n\nPrévia de exemplo: o conteúdo deste arquivo não foi copiado para o protótipo.\n`);
  const language = languageOf(entry.name);

  if (editing) {
    return <TextEditor entry={entry} original={text} onSave={setText} onClose={() => onEditingChange(false)} />;
  }

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex min-h-8 flex-wrap items-center justify-between gap-2">
        {language !== 'text' ? <Badge variant="secondary">{language}</Badge> : <span />}
        <Button variant="outline" className="min-h-11 sm:min-h-8" onClick={() => onEditingChange(true)}>
          <Pencil aria-hidden />
          Editar
        </Button>
      </div>
      {language === 'markdown' ? <Markdown className="rounded-lg border p-4 sm:p-6">{text}</Markdown> : <CodeBlock code={text} language={language === 'text' ? undefined : language} className="max-h-[75vh]" />}
    </div>
  );
}

function FilePreview({ entry, initialEditing = false }: { entry: FileEntry; initialEditing?: boolean }) {
  const [downloading, setDownloading] = useState(false);
  const [editing, setEditing] = useState(initialEditing);

  const download = () => {
    setDownloading(true);
    window.setTimeout(() => setDownloading(false), 900);
  };

  return (
    <section aria-label={`Pré-visualização de ${entry.name}`} className="flex min-w-0 flex-col gap-3 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200">
      <header className="flex min-w-0 flex-col gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
          <h2 className="min-w-0 truncate font-heading text-lg font-semibold">{entry.name}</h2>
          {entry.size !== null ? <span className="text-xs text-muted-foreground tabular-nums">{formatBytes(entry.size)}</span> : null}
          <Button variant="outline" className="ml-auto min-h-11 sm:min-h-8" disabled={downloading} onClick={download}>
            {downloading ? <LoaderCircle className="motion-safe:animate-spin" aria-hidden /> : <Download aria-hidden />}
            {downloading ? 'Baixando…' : 'Baixar'}
          </Button>
        </div>
      </header>
      <TextPreview key={entry.path} entry={entry} editing={editing} onEditingChange={setEditing} />
    </section>
  );
}

const FOLDER_NAME_RULE = 'Use um nome sem barras, diferente de “.” e “..”.';

function NewFolderDialog({ folder, open, onOpenChange, onCreate }: { folder: string; open: boolean; onOpenChange: (open: boolean) => void; onCreate: (name: string) => void }) {
  const ids = { name: useId(), rule: useId() };
  const [name, setName] = useState('');
  const [invalid, setInvalid] = useState(false);

  const changeOpen = (next: boolean) => {
    if (next) {
      setName('');
      setInvalid(false);
    }
    onOpenChange(next);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed === '' || trimmed === '.' || trimmed === '..' || trimmed.includes('/')) {
      setInvalid(true);
      return;
    }
    onCreate(trimmed);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogPopup>
        <DialogHeader>
          <DialogTitle>Nova pasta</DialogTitle>
          <DialogDescription>Dentro de {baseName(folder)}.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="contents">
          <DialogPanel className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor={ids.name}>Nome</Label>
              <Input id={ids.name} value={name} onChange={event => setName(event.target.value)} autoComplete="off" autoCapitalize="none" spellCheck={false} aria-invalid={invalid || undefined} aria-describedby={ids.rule} />
              <p id={ids.rule} className="text-xs text-muted-foreground">
                {FOLDER_NAME_RULE}
              </p>
            </div>
            {invalid ? <ErrorState title="Nome de pasta inválido." description={FOLDER_NAME_RULE} /> : null}
          </DialogPanel>
          <DialogFooter>
            <Button type="submit">Criar</Button>
          </DialogFooter>
        </form>
      </DialogPopup>
    </Dialog>
  );
}

interface UploadItem {
  id: number;
  name: string;
  percent: number;
  status: 'sending' | 'done';
}

function UploadList({ items, onClear }: { items: UploadItem[]; onClear: () => void }) {
  const finished = items.every(item => item.status === 'done');

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-1 motion-safe:duration-200">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{finished ? 'Envios concluídos' : 'Enviando…'}</p>
        {finished ? (
          <Button variant="ghost" size="icon-sm" className="size-11 sm:size-7" aria-label="Fechar envios" onClick={onClear}>
            <X />
          </Button>
        ) : null}
      </div>
      <ul aria-label="Envios" className="flex flex-col gap-3">
        {items.map(item => (
          <li key={item.id} className="flex min-w-0 flex-col gap-1">
            <div className="flex min-w-0 items-center justify-between gap-2 text-sm">
              <span className="min-w-0 truncate">{item.name}</span>
              <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                {item.status === 'done' ? <Check className="size-3.5 text-primary" aria-hidden /> : null}
                {item.status === 'done' ? 'Enviado' : `${item.percent}%`}
              </span>
            </div>
            <Progress value={item.percent} aria-label={`Progresso de ${item.name}`} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function ListingSkeleton() {
  return (
    <div aria-label="Carregando" className="flex flex-col gap-2">
      {[0, 1, 2, 3, 4].map(row => (
        <Skeleton key={row} className="h-8 w-full motion-reduce:animate-none" />
      ))}
    </div>
  );
}

function Problem({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-3">
      <ErrorState tone="warning" title={children} />
      <Link to="Arquivos/Arquivos" className="text-sm text-primary underline underline-offset-4">
        Ir para a pasta inicial
      </Link>
    </div>
  );
}

export type FilesState = 'ready' | 'loading' | 'error' | 'forbidden';

export interface FilesScreenProps {
  /** The path the page opens; null is the files area itself, at the home folder. */
  initialPath?: string | null;
  state?: FilesState;
  /** Opens a text file already in the editor. */
  editing?: boolean;
}

export function FilesScreen({ initialPath = null, state = 'ready', editing = false }: FilesScreenProps) {
  const [target, setTarget] = useState<string | null>(initialPath);
  const [created, setCreated] = useState<Record<string, FileEntry[]>>({});
  const [creating, setCreating] = useState(false);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const picker = useRef<HTMLInputElement>(null);
  const nextId = useRef(0);
  const shown = target ?? HOME;
  const listingOf = (path: string) => [...(LISTINGS[path] ?? []), ...(created[path] ?? [])].sort((a, b) => Number(b.is_directory) - Number(a.is_directory) || a.name.localeCompare(b.name, 'pt-BR'));
  const entry = target && target !== '/' ? listingOf(parentPath(target)).find(item => item.path === target) : undefined;
  const isFile = Boolean(entry && !entry.is_directory);
  const folder = isFile ? parentPath(shown) : shown;
  const ready = state === 'ready';

  const send = (event: ChangeEvent<HTMLInputElement>) => {
    const chosen = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (chosen.length === 0) return;
    const items = chosen.map(file => ({ id: (nextId.current += 1), name: file.name, percent: 0, status: 'sending' as const, size: file.size }));
    setUploads(items.map(({ size: _size, ...item }) => item));
    [35, 70, 100].forEach((percent, step) =>
      window.setTimeout(() => {
        setUploads(current => current.map(item => ({ ...item, percent, status: percent === 100 ? 'done' : 'sending' })));
        if (percent === 100) {
          setCreated(current => ({ ...current, [folder]: [...(current[folder] ?? []), ...items.map(item => ({ name: item.name, path: `${folder}/${item.name}`, is_directory: false, size: item.size }))] }));
        }
      }, (step + 1) * 450),
    );
  };

  const action = ready ? (
    <>
      <PageBarAction icon={Upload} label="Enviar arquivos" onClick={() => picker.current?.click()} />
      <input ref={picker} type="file" multiple aria-label="Arquivos para enviar" className="hidden" onChange={send} />
    </>
  ) : null;

  const bar = target && target !== '/' ? <PageBar title={baseName(target)} context="Arquivos" back={{ label: 'Voltar para Arquivos', to: 'Arquivos/Arquivos' }} action={action} /> : <PageBar area="arquivos" action={action} />;

  let body: ReactNode;
  if (state === 'loading') {
    body = <ListingSkeleton />;
  } else if (state === 'forbidden') {
    body = <Problem>Sem permissão para abrir este caminho.</Problem>;
  } else if (state === 'error') {
    body = <Problem>Não foi possível abrir este caminho: O dashboard não respondeu a tempo.</Problem>;
  } else if (isFile && entry) {
    body = (
      <div className="grid min-h-0 gap-6 md:grid-cols-[minmax(14rem,20rem)_minmax(0,1fr)]">
        <FolderView path={folder} entries={listingOf(folder)} selected={entry.path} onOpen={setTarget} className="md:sticky md:top-4 md:max-h-[calc(100svh-8rem)] md:overflow-y-auto md:border-r md:pr-4" />
        <FilePreview key={entry.path} entry={entry} initialEditing={editing} />
      </div>
    );
  } else {
    body = <FolderView path={shown} entries={listingOf(shown)} onOpen={setTarget} />;
  }

  return (
    <AppShell current="arquivos" bar={bar}>
      <section className={cn(isFile && ready ? 'flex w-full min-w-0 flex-col p-4 sm:p-6' : PAGE_COLUMN, 'gap-4')}>
        <div className="flex min-w-0 items-center justify-between gap-3">
          <PathTrail path={shown} onOpen={setTarget} />
          {ready ? (
            <>
              <Button variant="outline" size="sm" className="min-h-11 shrink-0 sm:min-h-7" onClick={() => setCreating(true)}>
                <FolderPlus aria-hidden />
                Nova pasta
              </Button>
              <NewFolderDialog
                folder={folder}
                open={creating}
                onOpenChange={setCreating}
                onCreate={name => setCreated(current => ({ ...current, [folder]: [...(current[folder] ?? []), { name, path: `${folder}/${name}`, is_directory: true, size: null }] }))}
              />
            </>
          ) : null}
        </div>
        {uploads.length > 0 ? <UploadList items={uploads} onClear={() => setUploads([])} /> : null}
        {body}
      </section>
    </AppShell>
  );
}
