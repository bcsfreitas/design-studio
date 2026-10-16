// The Quadro tab, ported from eru features/quadro (QuadroBoard, SyncLine, CardDrawer, CardActions, CardHistory,
// NewCardAction): the issue tracker line, the default assignee and the five columns; a card opens in the page drawer,
// where the actions of its state move it between columns.
import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent, type WheelEvent } from 'react';
import { useNavigate } from '@module/prototypes';
import { cn } from '#studio/runtime';
import { AlertDialog, AlertDialogClose, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogPopup, AlertDialogTitle } from '@/systems/eru/components/alert-dialog';
import { Button } from '@/systems/eru/components/button';
import { Dialog, DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from '@/systems/eru/components/dialog';
import { ErrorState } from '@/systems/eru/components/error-state';
import { Input } from '@/systems/eru/components/input';
import { Label } from '@/systems/eru/components/label';
import { LoadingState } from '@/systems/eru/components/loading-state';
import { Menu, MenuPopup, MenuRadioGroup, MenuRadioItem, MenuTrigger } from '@/systems/eru/components/menu';
import { Textarea } from '@/systems/eru/components/textarea';
import { Archive, ArrowRight, Check, ChevronDown, MessageSquareReply, Plus, RefreshCw, Send, Undo2 } from '@/systems/eru/libraries/icons';
import { acoesDo, COLUNA_DO_ESTADO, COLUNAS, ESTADO_LABEL, type QuadroCard, type Rastreador } from '../data/projeto';
import { useProjectPage } from './context';
import { PageDrawer } from './Drawer';

function trackerPhrase(rastreador: Rastreador) {
  switch (rastreador.tipo) {
    case 'github':
      return `Issues no GitHub (${rastreador.repositorio})`;
    case 'local':
      return 'Issues em arquivos dentro do projeto';
    default:
      return 'Sem lugar para as issues';
  }
}

/** The tracker line at the top of the board: when the issues were last read and "Sincronizar agora", or "Configurar" without a tracker. */
function SyncLine() {
  const { data } = useProjectPage();
  const navigate = useNavigate();
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(() => setRunning(false), 1400);
    return () => window.clearTimeout(timer);
  }, [running]);

  if (data.quadro.rastreador.tipo === 'nenhum') {
    return (
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <p className="min-w-0 text-xs text-muted-foreground">Sem lugar para as issues. O Quadro fica só no Hermes.</p>
          <Button variant="ghost" size="sm" className="-ml-2 min-h-11 sm:min-h-8" onClick={() => navigate('Sessão/Sessão')}>
            Configurar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
        <p role="status" className="min-w-0 text-xs text-muted-foreground">
          <span>{trackerPhrase(data.quadro.rastreador)}</span>
          <span aria-hidden> · </span>
          <span>{running ? 'Sincronizando…' : 'Sincronizado agora'}</span>
        </p>
        <Button variant="ghost" size="sm" className="-ml-2 min-h-11 gap-1.5 sm:min-h-8" disabled={running} onClick={() => setRunning(true)}>
          <RefreshCw aria-hidden className={running ? 'motion-safe:animate-spin' : undefined} />
          Sincronizar agora
        </Button>
      </div>
    </div>
  );
}

/** "Responsável: coder": the profile the new cards get, in a menu with the Hermes profiles. */
function DefaultAssignee({ value, onChange }: { value: string; onChange: (perfil: string) => void }) {
  const { data } = useProjectPage();
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
      <Menu>
        <MenuTrigger render={<Button variant="ghost" size="sm" className="-ml-2 min-h-11 gap-1.5 sm:min-h-8" />} aria-label={`Responsável dos cards novos: ${value}`}>
          <span className="text-muted-foreground">Responsável:</span>
          <span>{value}</span>
          <ChevronDown aria-hidden className="size-3.5 text-muted-foreground" />
        </MenuTrigger>
        <MenuPopup align="start">
          <MenuRadioGroup value={value} onValueChange={(next: string) => onChange(next)}>
            {data.quadro.perfis.map(perfil => (
              <MenuRadioItem key={perfil} value={perfil}>
                {perfil}
              </MenuRadioItem>
            ))}
          </MenuRadioGroup>
        </MenuPopup>
      </Menu>
      <p className="text-xs text-muted-foreground">Vale para os cards novos.</p>
    </div>
  );
}

function CardItem({ card }: { card: QuadroCard }) {
  const { drawer, setDrawer } = useProjectPage();
  const titleId = useId();
  const metaId = useId();
  const dono = card.comVoce ? 'com você' : (card.responsavel ?? 'sem responsável');
  return (
    <li className="relative">
      <button
        type="button"
        onClick={() => setDrawer({ kind: 'card', id: card.id })}
        aria-current={drawer?.kind === 'card' && drawer.id === card.id ? 'true' : undefined}
        aria-labelledby={titleId}
        aria-describedby={metaId}
        className={cn(
          'flex w-full cursor-pointer flex-col gap-1.5 rounded-lg bg-background/70 px-3 py-2.5 text-left ring-1 ring-h1 backdrop-blur-sm transition-colors duration-150 hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none aria-[current=true]:bg-h1 aria-[current=true]:shadow-[inset_2px_0_0_rgb(var(--tint))] motion-reduce:transition-none',
          card.issue && 'pr-12',
        )}
      >
        <span id={titleId} className="text-sm leading-snug wrap-anywhere text-ink">
          {card.titulo}
        </span>
        <span id={metaId} className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          {card.estado === 'running' ? <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-tint" /> : null}
          <span>{ESTADO_LABEL[card.estado]}</span>
          <span aria-hidden>·</span>
          <span className="truncate">{dono}</span>
        </span>
      </button>
      {card.issue ? (
        <a
          href="#"
          onClick={event => event.preventDefault()}
          aria-label={`Arquivo da issue ${card.issue}`}
          className="absolute top-1.5 right-1.5 max-w-24 truncate rounded-md px-1.5 py-1 font-mono text-[11px] text-muted-foreground tabular-nums hover:bg-muted hover:text-ink focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {card.issue}
        </a>
      ) : null}
    </li>
  );
}

function sideways(event: WheelEvent<HTMLDivElement>) {
  if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) event.currentTarget.scrollLeft += event.deltaY;
}

function Columns() {
  const { cards } = useProjectPage();
  return (
    <div onWheel={sideways} className="grid min-w-0 auto-cols-[minmax(15rem,1fr)] grid-flow-col gap-3 overflow-x-auto overscroll-x-contain pb-2">
      {COLUNAS.map(coluna => {
        const inColumn = cards.filter(card => COLUNA_DO_ESTADO[card.estado] === coluna.id);
        return (
          <section key={coluna.id} aria-label={coluna.label} className="flex min-w-0 flex-col gap-2 rounded-2xl bg-muted/40 p-2">
            <h2 className="flex items-baseline justify-between gap-2 px-1 pt-1 text-[13px] font-medium">
              {coluna.label}
              <span aria-label={`${inColumn.length} ${inColumn.length === 1 ? 'card' : 'cards'}`} className="text-xs font-normal text-muted-foreground tabular-nums">
                {inColumn.length}
              </span>
            </h2>
            {inColumn.length > 0 ? (
              <ul aria-label={coluna.label} className="flex flex-col gap-2">
                {inColumn.map(card => (
                  <CardItem key={card.id} card={card} />
                ))}
              </ul>
            ) : (
              <p className="px-1 py-3 text-xs text-muted-foreground">Nenhum card.</p>
            )}
          </section>
        );
      })}
    </div>
  );
}

/** The board: the tracker line and the default assignee on top and the cards in the five columns. */
export function QuadroBoard() {
  const { data, status, retry } = useProjectPage();
  const [responsavel, setResponsavel] = useState(data.quadro.responsavel);

  if (status === 'carregando') return <LoadingState label="Carregando o Quadro" lines={3} />;
  if (status === 'erro') return <ErrorState title="Não foi possível carregar o Quadro." onRetry={retry} />;
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <SyncLine />
      <DefaultAssignee value={responsavel} onChange={setResponsavel} />
      <Columns />
    </div>
  );
}

function Answer({ card, onAnswer }: { card: QuadroCard; onAnswer: () => void }) {
  const [texto, setTexto] = useState('');
  const id = useId();
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (texto.trim()) onAnswer();
  };
  return (
    <form onSubmit={submit} aria-label="Responder ao agente" className="flex flex-col gap-2 rounded-xl bg-muted/50 p-3 ring-1 ring-h1">
      <p className="text-xs text-muted-foreground">O agente perguntou</p>
      <p className="text-sm whitespace-pre-wrap text-ink">{card.pergunta ?? 'O agente parou e espera você, sem deixar a pergunta escrita.'}</p>
      <Label htmlFor={id} className="sr-only">
        Sua resposta
      </Label>
      <Textarea id={id} value={texto} onChange={event => setTexto(event.target.value)} rows={3} placeholder="Sua resposta" />
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={!texto.trim()}>
          <MessageSquareReply aria-hidden />
          Responder e desbloquear
        </Button>
      </div>
    </form>
  );
}

function RequestChanges({ onSend, onCancel }: { onSend: () => void; onCancel: () => void }) {
  const [texto, setTexto] = useState('');
  const id = useId();
  const field = useRef<HTMLTextAreaElement>(null);
  useEffect(() => field.current?.focus(), []);
  return (
    <form
      onSubmit={event => {
        event.preventDefault();
        if (texto.trim()) onSend();
      }}
      aria-label="Pedir mudanças"
      className="flex flex-1 basis-full flex-col gap-2"
    >
      <Label htmlFor={id}>O que precisa mudar</Label>
      <Textarea ref={field} id={id} value={texto} onChange={event => setTexto(event.target.value)} rows={3} />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={!texto.trim()}>
          Mandar de volta ao agente
        </Button>
      </div>
    </form>
  );
}

/** The actions the card's state allows: Pronto para o agente, Mandar para o agente, Responder, Aprovar, Pedir mudanças and Arquivar. */
function CardActions({ card, onClose }: { card: QuadroCard; onClose: () => void }) {
  const { act } = useProjectPage();
  const [asking, setAsking] = useState<'arquivar' | 'pedir-mudancas' | null>(null);
  const [approving, setApproving] = useState(false);
  const acoes = acoesDo(card);
  const has = (acao: (typeof acoes)[number]) => acoes.includes(acao);
  if (acoes.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {has('responder') ? <Answer card={card} onAnswer={() => act(card.id, 'responder')} /> : null}
      <div role="group" aria-label="Ações do card" className="flex flex-wrap items-center gap-2">
        {asking === 'arquivar' ? (
          <>
            <p className="basis-full text-sm text-ink">
              {card.issue && card.estado !== 'done'
                ? `Arquivar este card? Ele sai do Quadro, e a issue ${card.issue} fica marcada no arquivo dela como não planejada.`
                : 'Arquivar este card? Ele sai do Quadro e do Kanban do Hermes.'}
            </p>
            <span className="flex-1" />
            <Button variant="ghost" size="sm" onClick={() => setAsking(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                act(card.id, 'arquivar');
                onClose();
              }}
            >
              Arquivar
            </Button>
          </>
        ) : asking === 'pedir-mudancas' ? (
          <RequestChanges onSend={() => act(card.id, 'pedir-mudancas')} onCancel={() => setAsking(null)} />
        ) : (
          <>
            {has('pronto') ? (
              <Button size="sm" onClick={() => act(card.id, 'pronto')}>
                <ArrowRight aria-hidden />
                Pronto para o agente
              </Button>
            ) : null}
            {has('mandar') ? (
              <Button size="sm" onClick={() => act(card.id, 'mandar')}>
                <Send aria-hidden />
                Mandar para o agente
              </Button>
            ) : null}
            {has('aprovar') ? (
              <Button size="sm" onClick={() => setApproving(true)}>
                <Check aria-hidden />
                Aprovar
              </Button>
            ) : null}
            {has('pedir-mudancas') ? (
              <Button variant="outline" size="sm" onClick={() => setAsking('pedir-mudancas')}>
                <Undo2 aria-hidden />
                Pedir mudanças
              </Button>
            ) : null}
            <span className="flex-1" />
            {has('arquivar') ? (
              <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setAsking('arquivar')}>
                <Archive aria-hidden />
                Arquivar
              </Button>
            ) : null}
          </>
        )}
      </div>
      {has('aprovar') ? (
        <AlertDialog open={approving} onOpenChange={setApproving}>
          <AlertDialogPopup>
            <AlertDialogHeader>
              <AlertDialogTitle>Aprovar o card?</AlertDialogTitle>
              <AlertDialogDescription>
                {card.issue ? `A issue ${card.issue} fica fechada no arquivo dela, com o resumo do agente nos comentários, e “${card.titulo}” vai para Feito.` : `“${card.titulo}” vai para Feito, e o agente não trabalha mais nele.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogClose render={<Button variant="ghost" />}>Cancelar</AlertDialogClose>
              <Button
                onClick={() => {
                  act(card.id, 'aprovar');
                  setApproving(false);
                }}
              >
                Aprovar
              </Button>
            </AlertDialogFooter>
          </AlertDialogPopup>
        </AlertDialog>
      ) : null}
    </div>
  );
}

function CardRuns({ card }: { card: QuadroCard }) {
  const execucoes = card.execucoes ?? [];
  if (execucoes.length === 0) return null;
  return (
    <section aria-labelledby="card-execucoes" className="flex flex-col gap-2">
      <h3 id="card-execucoes" className="text-xs font-medium text-muted-foreground">
        O que o agente fez
      </h3>
      <ol aria-label="Execuções do agente" className="flex flex-col divide-y divide-h1 rounded-xl ring-1 ring-h1">
        {[...execucoes].reverse().map(execucao => (
          <li key={execucao.id} className="flex min-w-0 flex-col gap-1 px-3 py-2.5">
            <p className="flex min-w-0 flex-wrap items-center gap-x-1.5 text-sm text-ink">
              {execucao.duracao === null ? <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-tint" /> : null}
              <span>{execucao.desfecho}</span>
            </p>
            <p className="text-xs text-muted-foreground">{[execucao.perfil, execucao.quando, execucao.duracao ? `em ${execucao.duracao}` : null].filter(Boolean).join(' · ')}</p>
            {execucao.resumo ? <p className="text-sm whitespace-pre-wrap wrap-anywhere text-ink/90">{execucao.resumo}</p> : null}
            <details className="group text-xs text-muted-foreground">
              <summary className="inline-flex min-h-11 cursor-pointer items-center rounded-md px-1 select-none hover:text-ink sm:min-h-7">Detalhes técnicos</summary>
              <dl className="mt-1 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 font-mono text-[11px]">
                <dt>execução</dt>
                <dd>{execucao.id}</dd>
                <dt>perfil</dt>
                <dd>{execucao.perfil}</dd>
              </dl>
            </details>
          </li>
        ))}
      </ol>
    </section>
  );
}

function CardComments({ card }: { card: QuadroCard }) {
  const comentarios = card.comentarios ?? [];
  if (comentarios.length === 0) return null;
  return (
    <section aria-labelledby="card-comentarios" className="flex flex-col gap-2">
      <h3 id="card-comentarios" className="text-xs font-medium text-muted-foreground">
        Comentários
      </h3>
      <ul aria-label="Comentários" className="flex flex-col gap-2">
        {comentarios.map(comentario => (
          <li key={comentario.id} className="flex min-w-0 flex-col gap-0.5 rounded-xl bg-muted/40 px-3 py-2">
            <p className="text-xs text-muted-foreground">
              <span className="text-ink">{comentario.autor === 'eru' ? 'Você' : comentario.autor}</span>
              {' · '}
              {comentario.quando}
            </p>
            <p className="text-sm whitespace-pre-wrap wrap-anywhere text-ink">{comentario.texto}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CardBody({ card, onClose }: { card: QuadroCard; onClose: () => void }) {
  const { act, data } = useProjectPage();
  const [titulo, setTitulo] = useState<string | null>(null);
  const [descricao, setDescricao] = useState<string | null>(null);
  const coluna = COLUNAS.find(item => item.id === COLUNA_DO_ESTADO[card.estado])?.label;
  const current = card.responsavel ?? 'ninguém';

  const saveTitle = () => {
    if (titulo !== null && titulo.trim() && titulo.trim() !== card.titulo) act(card.id, 'editar', { titulo: titulo.trim() });
    setTitulo(null);
  };

  const onTitleKey = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      event.currentTarget.blur();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setTitulo(null);
    }
  };

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Textarea
          unstyled
          aria-label="Título do card"
          value={titulo ?? card.titulo}
          onChange={event => setTitulo(event.target.value)}
          onBlur={saveTitle}
          onKeyDown={onTitleKey}
          maxLength={300}
          rows={1}
          className="-mx-2 rounded-lg font-display text-[19px] leading-snug text-ink hover:bg-muted/40 has-focus-visible:bg-muted/40 has-focus-visible:ring-2 has-focus-visible:ring-ring/40 [&_textarea]:min-h-0 [&_textarea]:resize-none [&_textarea]:px-2 [&_textarea]:py-1"
        />
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {card.estado === 'running' ? <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-tint" /> : null}
            <span>
              <span className="sr-only">Estado: </span>
              {coluna} · {ESTADO_LABEL[card.estado]}
            </span>
          </p>
          {card.estado === 'running' ? (
            <span className="text-xs text-muted-foreground">Responsável: {current}</span>
          ) : (
            <Menu>
              <MenuTrigger render={<Button variant="ghost" size="sm" className="-ml-2 min-h-11 gap-1.5 sm:min-h-8" />} aria-label={`Responsável do card: ${current}`}>
                <span className="text-muted-foreground">Responsável:</span>
                <span>{current}</span>
                <ChevronDown aria-hidden className="size-3.5 text-muted-foreground" />
              </MenuTrigger>
              <MenuPopup align="start">
                <MenuRadioGroup value={card.responsavel ?? ''} onValueChange={(value: string) => act(card.id, 'editar', { responsavel: value || null })}>
                  {data.quadro.perfis.map(perfil => (
                    <MenuRadioItem key={perfil} value={perfil}>
                      {perfil}
                    </MenuRadioItem>
                  ))}
                  <MenuRadioItem value="">Ninguém (fica com você)</MenuRadioItem>
                </MenuRadioGroup>
              </MenuPopup>
            </Menu>
          )}
          {card.issue ? (
            <a href="#" onClick={event => event.preventDefault()} className="text-xs text-muted-foreground underline-offset-2 hover:text-ink hover:underline">
              Arquivo da issue {card.issue}
            </a>
          ) : null}
        </div>
      </div>
      <Textarea
        aria-label="Descrição do card"
        placeholder="Sem descrição. Escreva o que o agente precisa saber."
        value={descricao ?? card.descricao ?? ''}
        onChange={event => setDescricao(event.target.value)}
        onBlur={() => {
          if (descricao !== null) act(card.id, 'editar', { descricao });
          setDescricao(null);
        }}
        rows={3}
      />
      <CardActions key={card.estado} card={card} onClose={onClose} />
      <CardRuns card={card} />
      <CardComments card={card} />
    </div>
  );
}

/** The open card in the page drawer: its column on the header, the editable title and description, the actions and the history. */
export function CardDrawer({ id }: { id: string }) {
  const { cards, setDrawer } = useProjectPage();
  const card = cards.find(item => item.id === id);
  const close = () => setDrawer(null);
  const coluna = card ? COLUNAS.find(item => item.id === COLUNA_DO_ESTADO[card.estado])?.label : undefined;
  return (
    <PageDrawer label={card ? `Card ${card.titulo}` : 'Card'} title={coluna ?? 'Card'} onClose={close}>
      {card ? <CardBody card={card} onClose={close} /> : <ErrorState title="Esse card não existe mais no Quadro." />}
    </PageDrawer>
  );
}

/** "Card novo", the bar's action on the board: title and description; the card is born in A fazer with the default assignee. */
export function NewCardAction() {
  const { data, addCard } = useProjectPage();
  const [open, setOpen] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const id = useId();
  const local = data.quadro.rastreador.tipo === 'local';

  const change = (next: boolean) => {
    setOpen(next);
    if (next) {
      setTitulo('');
      setDescricao('');
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!titulo.trim()) return;
    addCard({ id: `c-${Date.now()}`, titulo: titulo.trim(), descricao: descricao.trim(), estado: 'scheduled', responsavel: data.quadro.responsavel });
    setOpen(false);
  };

  return (
    <>
      <Button size="sm" onClick={() => change(true)}>
        <Plus aria-hidden />
        Card novo
      </Button>
      <Dialog open={open} onOpenChange={change}>
        <DialogPopup>
          <DialogHeader>
            <DialogTitle>Card novo</DialogTitle>
            <DialogDescription>
              Entra em A fazer com o responsável {data.quadro.responsavel}. Só roda quando você mandar para o agente.
              {local ? ' Vira também um arquivo de issue dentro do projeto, marcado como pronto para o agente.' : ''}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="contents">
            <DialogPanel className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor={`${id}-titulo`}>Título</Label>
                <Input id={`${id}-titulo`} value={titulo} onChange={event => setTitulo(event.target.value)} maxLength={300} autoFocus />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor={`${id}-descricao`}>Descrição</Label>
                <Textarea id={`${id}-descricao`} value={descricao} onChange={event => setDescricao(event.target.value)} rows={6} />
              </div>
            </DialogPanel>
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="ghost" />}>Cancelar</DialogClose>
              <Button type="submit" disabled={!titulo.trim()}>
                Criar card
              </Button>
            </DialogFooter>
          </form>
        </DialogPopup>
      </Dialog>
    </>
  );
}
