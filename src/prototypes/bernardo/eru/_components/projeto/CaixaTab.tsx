// The Caixa tab, ported from eru features/caixa (CaixaTab, CaixaPreview): the project's inbox, the files in .files/
// (and its subfolders), each one with its menu (Baixar, Renomear, Usar numa sessão nova, Apagar) and its preview in the
// page drawer. "Enviar arquivo" in the bar adds the chosen files to the open folder.
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate } from '@module/prototypes';
import { cn } from '#studio/runtime';
import { AlertDialog, AlertDialogClose, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogPopup, AlertDialogTitle } from '@/systems/eru/components/alert-dialog';
import { Button } from '@/systems/eru/components/button';
import { ErrorState } from '@/systems/eru/components/error-state';
import { LoadingState } from '@/systems/eru/components/loading-state';
import { Markdown } from '@/systems/eru/components/markdown';
import { Menu, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from '@/systems/eru/components/menu';
import { ChevronRight, Download, EllipsisVertical, File, FileCode, FileImage, FileText, Folder, MessageSquarePlus, Pencil, Trash2, Upload } from '@/systems/eru/libraries/icons';
import type { CaixaItem } from '../data/projeto';
import { leafOf, useProjectPage } from './context';
import { PageDrawer } from './Drawer';
import { EmptyTab } from './parts';

const ROW =
  'flex min-h-14 min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors duration-150 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none';
const IN_ROW = 'shrink-0 transition-opacity duration-150 max-md:size-11 md:opacity-0 md:group-hover/row:opacity-100 md:group-focus-within/row:opacity-100 md:data-popup-open:opacity-100 motion-reduce:transition-none';

const parentOf = (caminho: string) => (caminho.includes('/') ? caminho.slice(0, caminho.lastIndexOf('/')) : '');

function Thumb({ item }: { item: CaixaItem }) {
  if (item.previa === 'imagem' && item.cores) {
    return <span aria-hidden className="size-10 shrink-0 rounded-md bg-h1" style={{ background: `radial-gradient(circle at 50% 38%, ${item.cores[1]} 0%, ${item.cores[0]} 62%)` }} />;
  }
  const Icon = item.previa === 'imagem' ? FileImage : item.previa === 'texto' || item.previa === 'pdf' ? FileText : item.previa === 'pagina' ? FileCode : File;
  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-h1 text-muted-foreground">
      <Icon aria-hidden className="size-4.5" />
    </span>
  );
}

function RenameField({ item, onDone }: { item: CaixaItem; onDone: () => void }) {
  const { setCaixa, drawer, setDrawer } = useProjectPage();
  const input = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(item.nome);

  useEffect(() => {
    const field = input.current;
    field?.focus();
    const dot = item.nome.lastIndexOf('.');
    field?.setSelectionRange(0, dot > 0 ? dot : item.nome.length);
  }, [item.nome]);

  const save = () => {
    const novo = value.trim();
    if (novo && novo !== item.nome) {
      const caminho = parentOf(item.caminho) ? `${parentOf(item.caminho)}/${novo}` : novo;
      setCaixa(items => items.map(entry => (entry.caminho === item.caminho ? { ...entry, nome: novo, caminho } : entry)));
      if (drawer?.kind === 'arquivo' && drawer.caminho === item.caminho) setDrawer({ kind: 'arquivo', caminho });
    }
    onDone();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      save();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onDone();
    }
  };

  return (
    <div className="flex min-h-14 min-w-0 flex-1 flex-col justify-center gap-1 px-2 py-2">
      <div className="flex min-w-0 items-center gap-3">
        <Thumb item={item} />
        <input
          ref={input}
          aria-label={`Novo nome de ${item.nome}`}
          value={value}
          onChange={event => setValue(event.target.value)}
          onKeyDown={onKeyDown}
          onBlur={onDone}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          className="h-9 min-w-0 flex-1 rounded-md border border-h2 bg-transparent px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
    </div>
  );
}

function FileRow({ item }: { item: CaixaItem }) {
  const { drawer, setDrawer, setCaixa } = useProjectPage();
  const navigate = useNavigate();
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const open = drawer?.kind === 'arquivo' && drawer.caminho === item.caminho;

  return (
    <li aria-label={item.nome} className="group/row flex min-w-0 items-center gap-1">
      {renaming ? (
        <RenameField item={item} onDone={() => setRenaming(false)} />
      ) : (
        <button
          type="button"
          aria-label={item.nome}
          aria-current={open ? 'true' : undefined}
          className={cn(ROW, 'aria-[current=true]:bg-h1 aria-[current=true]:shadow-[inset_2px_0_0_rgb(var(--tint))]')}
          onClick={() => setDrawer({ kind: 'arquivo', caminho: item.caminho })}
        >
          <Thumb item={item} />
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-sm font-medium">{item.nome}</span>
            <span className="truncate text-xs text-muted-foreground">
              {item.tamanho} · {item.modificado}
            </span>
          </span>
        </button>
      )}
      <Menu>
        <MenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Ações de ${item.nome}`} className={IN_ROW} />}>
          <EllipsisVertical aria-hidden />
        </MenuTrigger>
        <MenuPopup align="end">
          <MenuItem>
            <Download aria-hidden />
            Baixar
          </MenuItem>
          <MenuItem onClick={() => setRenaming(true)}>
            <Pencil aria-hidden />
            Renomear
          </MenuItem>
          <MenuItem onClick={() => navigate('Sessão/Nova sessão')}>
            <MessageSquarePlus aria-hidden />
            Usar numa sessão nova
          </MenuItem>
          <MenuSeparator />
          <MenuItem variant="destructive" onClick={() => setDeleting(true)}>
            <Trash2 aria-hidden />
            Apagar
          </MenuItem>
        </MenuPopup>
      </Menu>
      <AlertDialog open={deleting} onOpenChange={setDeleting}>
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar o arquivo?</AlertDialogTitle>
            <AlertDialogDescription>“{item.nome}” sai da Caixa e não dá para desfazer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="ghost" />}>Cancelar</AlertDialogClose>
            <Button
              variant="destructive"
              onClick={() => {
                setDeleting(false);
                if (open) setDrawer(null);
                setCaixa(items => items.filter(entry => entry.caminho !== item.caminho));
              }}
            >
              Apagar
            </Button>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </li>
  );
}

function FolderRow({ item }: { item: CaixaItem }) {
  const { setDentro } = useProjectPage();
  return (
    <li aria-label={item.nome} className="flex min-w-0">
      <button type="button" onClick={() => setDentro(item.caminho)} aria-label={`Pasta ${item.nome}`} className={ROW}>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-h1 text-muted-foreground">
          <Folder aria-hidden className="size-4.5" />
        </span>
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-sm font-medium">{item.nome}</span>
          <span className="text-xs text-muted-foreground">Pasta</span>
        </span>
      </button>
    </li>
  );
}

/** Where the list is when a subfolder is open: Caixa › refs › marca, each part a link. */
function Trail({ dentro }: { dentro: string }) {
  const { setDentro } = useProjectPage();
  const parts = dentro.split('/').filter(Boolean);
  const LINK = 'cursor-pointer truncate rounded-md px-1 text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none';
  return (
    <nav aria-label="Pasta da Caixa" className="flex min-w-0 flex-wrap items-center gap-1 text-sm">
      <button type="button" onClick={() => setDentro('')} className={LINK}>
        Caixa
      </button>
      {parts.map((part, index) => (
        <span key={index} className="flex min-w-0 items-center gap-1">
          <ChevronRight aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
          {index === parts.length - 1 ? (
            <span aria-current="page" className="truncate px-1 font-mono text-[12.5px]">
              {part}
            </span>
          ) : (
            <button type="button" onClick={() => setDentro(parts.slice(0, index + 1).join('/'))} className={cn(LINK, 'font-mono text-[12.5px]')}>
              {part}
            </button>
          )}
        </span>
      ))}
    </nav>
  );
}

export function CaixaTab() {
  const { caixa, status, retry, dentro } = useProjectPage();
  const items = caixa.filter(item => parentOf(item.caminho) === dentro);

  if (status === 'carregando') return <LoadingState label="Carregando a Caixa" lines={4} />;
  if (status === 'erro') return <ErrorState title="Não foi possível ler a Caixa do projeto." onRetry={retry} />;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {dentro ? <Trail dentro={dentro} /> : null}
      {items.length === 0 ? (
        <EmptyTab>{dentro ? 'Esta pasta está vazia.' : 'Nenhum arquivo ainda. Solte arquivos em qualquer ponto da aba, ou use “Enviar arquivo”; eles ficam em .files/.'}</EmptyTab>
      ) : (
        <ul aria-label={dentro ? `Arquivos de ${leafOf(dentro)}` : 'Arquivos da Caixa'} className="flex flex-col gap-0.5">
          {items.map(item => (item.pasta ? <FolderRow key={item.caminho} item={item} /> : <FileRow key={item.caminho} item={item} />))}
        </ul>
      )}
    </div>
  );
}

/** The file in the page drawer: the size and date and the preview by type (image, PDF, text or only the invitation to download). */
export function FileDrawer({ caminho }: { caminho: string }) {
  const { caixa, setDrawer } = useProjectPage();
  const navigate = useNavigate();
  const item = caixa.find(entry => entry.caminho === caminho && !entry.pasta);
  const nome = leafOf(caminho);
  return (
    <PageDrawer
      label={`Prévia de ${nome}`}
      title={caminho}
      onClose={() => setDrawer(null)}
      actions={
        item ? (
          <>
            <Button variant="ghost" size="icon-sm" aria-label={`Baixar ${item.nome}`} title="Baixar">
              <Download aria-hidden />
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label="Usar numa sessão nova" title="Usar numa sessão nova" onClick={() => navigate('Sessão/Nova sessão')}>
              <MessageSquarePlus aria-hidden />
            </Button>
          </>
        ) : null
      }
    >
      {item ? (
        <div className="flex min-w-0 flex-col gap-3">
          <p className="text-xs text-muted-foreground">
            {item.tamanho} · {item.modificado}
          </p>
          {item.previa === 'imagem' && item.cores ? (
            <div className="flex justify-center rounded-lg bg-h1 p-2">
              <div role="img" aria-label={item.nome} className="aspect-[3/2] w-full" style={{ background: `radial-gradient(circle at 50% 40%, ${item.cores[1]} 0%, ${item.cores[0]} 65%)` }} />
            </div>
          ) : item.previa === 'texto' ? (
            /\.(?:md|markdown)$/i.test(item.nome) ? <Markdown>{item.texto ?? ''}</Markdown> : <pre className="font-mono text-[12.5px] leading-relaxed break-words whitespace-pre-wrap text-foreground">{item.texto}</pre>
          ) : item.previa === 'pdf' ? (
            <div className="flex h-[calc(100svh-12rem)] min-h-80 w-full flex-col gap-3 rounded-lg border border-h2 bg-white p-8">
              <span className="h-3 w-1/2 rounded bg-black/70" />
              {Array.from({ length: 12 }, (_, index) => (
                <span key={index} className="h-1.5 rounded bg-black/15" style={{ width: `${70 + ((index * 17) % 30)}%` }} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-h2 px-4 py-8 text-sm text-muted-foreground">
              <p>Sem prévia para este tipo de arquivo.</p>
              <Button variant="outline" size="sm">
                <Download aria-hidden />
                Baixar
              </Button>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Este arquivo não existe mais na Caixa: foi apagado ou mudou de nome.</p>
      )}
    </PageDrawer>
  );
}

const sizeOf = (bytes: number) => (bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`);

/** "Enviar arquivo", the bar's action on Caixa: chooses one or more files and puts them in the open folder. */
export function SendFileAction() {
  const { setCaixa, dentro } = useProjectPage();
  const picker = useRef<HTMLInputElement>(null);
  return (
    <>
      <Button size="sm" onClick={() => picker.current?.click()}>
        <Upload aria-hidden />
        Enviar arquivo
      </Button>
      <input
        ref={picker}
        type="file"
        multiple
        aria-label="Arquivos para enviar"
        className="hidden"
        onChange={event => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = '';
          const added: CaixaItem[] = files.map(file => ({
            caminho: dentro ? `${dentro}/${file.name}` : file.name,
            nome: file.name,
            previa: file.type.startsWith('image/') ? 'imagem' : file.type.startsWith('text/') ? 'texto' : file.type === 'application/pdf' ? 'pdf' : 'nenhuma',
            tamanho: sizeOf(file.size),
            modificado: 'Hoje, agora',
            cores: file.type.startsWith('image/') ? ['#2a2a30', '#9a8a70'] : undefined,
            texto: '',
          }));
          setCaixa(items => [...added, ...items.filter(item => !added.some(entry => entry.caminho === item.caminho))]);
        }}
      />
    </>
  );
}
