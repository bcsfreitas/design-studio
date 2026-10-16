// The cards that stop the turn and wait for the user, ported from eru features/approval/ApprovalCard.tsx and
// features/clarify/ClarifyCard.tsx. Answers are local: the page decides what happens next.
import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { cn } from '#studio/runtime';
import { Button } from '@/systems/eru/components/button';
import { Check, MessageCircleQuestionMark, ShieldAlert } from '@/systems/eru/libraries/icons';
import type { ClarifyQuestion } from '../data/session';

export type ApprovalScope = 'once' | 'session' | 'always';
export type ApprovalChoice = ApprovalScope | 'deny';

const SCOPE_TEXT: Record<ApprovalScope, { label: string; name: string }> = {
  once: { label: 'Só desta vez', name: 'Aprovar só desta vez' },
  session: { label: 'Nesta sessão', name: 'Aprovar nesta sessão' },
  always: { label: 'Sempre', name: 'Aprovar sempre' },
};

const ACTION = 'h-11 text-sm sm:h-8';

/**
 * The approval request for a dangerous command, at the end of the turn and right above the message field: the whole command,
 * the reason in plain words and the ways to approve that Hermes accepts, besides refusing. "Sempre" asks for confirmation.
 */
export function ApprovalCard({ request, waiting = 0, onAnswer }: { request: { command: string; reason: string | null; scopes: readonly ApprovalScope[] }; waiting?: number; onAnswer: (choice: ApprovalChoice) => void }) {
  const [confirming, setConfirming] = useState(false);
  const keep = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (confirming) keep.current?.focus();
  }, [confirming]);

  return (
    <section tabIndex={-1} aria-label="Pedido de aprovação" className="question-card-in scroll-mt-20 scroll-mb-44 rounded-lg border border-h2 bg-raised outline-none">
      <header className="flex items-center gap-2 px-4 pt-3 text-xs text-muted-foreground">
        <ShieldAlert className="size-3.5 shrink-0 text-warning" aria-hidden />
        <span className="min-w-0 flex-1 truncate">O agente pede sua aprovação</span>
        {waiting > 0 ? <span className="shrink-0 tabular-nums">+{waiting} na fila</span> : null}
      </header>
      <div className="flex min-w-0 flex-col gap-2.5 px-4 pt-2.5 pb-4">
        <p className="text-sm font-medium">{request.command ? 'Quer rodar este comando:' : 'Quer fazer esta ação:'}</p>
        {request.command ? (
          <pre aria-label="Comando" className="max-h-48 min-w-0 overflow-y-auto rounded-lg border bg-muted/40 px-3 py-2 font-mono text-[13px] leading-relaxed wrap-anywhere whitespace-pre-wrap">
            {request.command}
          </pre>
        ) : null}
        {request.reason ? (
          <p className="text-sm wrap-anywhere text-muted-foreground">
            <span className="font-medium text-foreground/85">Por quê: </span>
            {request.reason}
          </p>
        ) : null}
      </div>
      {confirming ? (
        <div className="flex flex-col gap-2 border-t px-3 py-2.5 sm:flex-row sm:items-center">
          <p className="min-w-0 flex-1 px-1 text-xs text-muted-foreground">Comandos como este não vão mais pedir aprovação, em nenhuma sessão.</p>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Button ref={keep} variant="outline" size="sm" className={ACTION} onClick={() => setConfirming(false)}>
              Voltar
            </Button>
            <Button size="sm" className={ACTION} aria-label="Confirmar: aprovar sempre" onClick={() => onAnswer('always')}>
              Aprovar sempre
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col-reverse gap-2 border-t px-3 py-2.5 sm:flex-row sm:items-center">
          <Button variant="outline" size="sm" className={ACTION} onClick={() => onAnswer('deny')}>
            Recusar
          </Button>
          <div role="group" aria-label="Aprovar" className="flex min-w-0 flex-col gap-1.5 sm:ml-auto sm:flex-row sm:items-center sm:gap-2">
            <span aria-hidden className="px-1 text-xs text-muted-foreground">
              Aprovar
            </span>
            <div className={cn('grid gap-2 sm:flex', request.scopes.length === 1 ? 'grid-cols-1' : request.scopes.length === 2 ? 'grid-cols-2' : 'grid-cols-3')}>
              {request.scopes.map(scope => (
                <Button
                  key={scope}
                  variant={scope === 'once' ? 'default' : 'outline'}
                  size="sm"
                  className={ACTION}
                  aria-label={SCOPE_TEXT[scope].name}
                  onClick={() => (scope === 'always' ? setConfirming(true) : onAnswer(scope))}
                >
                  {SCOPE_TEXT[scope].label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export interface Draft {
  picked: string[];
  other: boolean;
  text: string;
}

const EMPTY: Draft = { picked: [], other: false, text: '' };

function answerOf(draft: Draft) {
  const written = draft.other && draft.text.trim() ? [draft.text.trim()] : [];
  const answer = [...draft.picked, ...written];
  return answer.length > 0 ? answer.join(', ') : null;
}

const ROW = 'flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm hover:bg-muted/60 has-checked:border-primary/50 has-checked:bg-primary/8 has-focus-visible:ring-2 has-focus-visible:ring-ring/50 sm:min-h-10';
const FIELD = 'block w-full resize-none bg-transparent text-base leading-relaxed outline-none field-sizing-content placeholder:text-muted-foreground/72 sm:text-sm';

function Mark({ multi }: { multi: boolean }) {
  return multi ? (
    <span aria-hidden className="flex size-4 shrink-0 items-center justify-center rounded-[5px] border border-input text-primary-foreground group-has-checked/option:border-primary group-has-checked/option:bg-primary">
      <Check className="size-3 opacity-0 group-has-checked/option:opacity-100" strokeWidth={3} />
    </span>
  ) : (
    <span aria-hidden className="flex size-4 shrink-0 items-center justify-center rounded-full border border-input group-has-checked/option:border-primary group-has-checked/option:bg-primary">
      <span className="size-1.5 rounded-full bg-primary-foreground opacity-0 group-has-checked/option:opacity-100" />
    </span>
  );
}

function Shortcut({ value }: { value: number }) {
  return value <= 9 ? <kbd aria-hidden className="ml-auto hidden shrink-0 rounded border px-1.5 font-mono text-[10px] leading-4 text-muted-foreground pointer-fine:inline">{value}</kbd> : null;
}

function QuestionBlock({ question, index, draft, name, onChange }: { question: ClarifyQuestion; index: number; draft: Draft; name: string; onChange: (draft: Draft) => void }) {
  const titleId = useId();
  const hintId = useId();
  const otherField = useRef<HTMLTextAreaElement>(null);
  const type = question.multi ? 'checkbox' : 'radio';

  const pick = (value: string) =>
    onChange(question.multi ? { ...draft, picked: draft.picked.includes(value) ? draft.picked.filter(item => item !== value) : [...draft.picked, value] } : { ...draft, picked: [value], other: false });

  const pickOther = () => {
    onChange(question.multi ? { ...draft, other: !draft.other } : { ...draft, picked: [], other: true });
    otherField.current?.focus();
  };

  const write = (text: string) => onChange({ ...draft, text, other: text.trim() ? true : draft.other, picked: question.multi || !text.trim() ? draft.picked : [] });

  return (
    <div data-question={index} role={question.multi ? 'group' : 'radiogroup'} aria-labelledby={titleId} aria-describedby={question.multi ? hintId : undefined} className="flex min-w-0 flex-col gap-2">
      <p id={titleId} className="min-w-0 flex-1 text-sm font-medium wrap-anywhere whitespace-pre-wrap">
        {question.question}
      </p>
      {question.multi ? (
        <p id={hintId} className="-mt-1 text-xs text-muted-foreground">
          Escolha quantas quiser.
        </p>
      ) : null}
      <div className="flex flex-col gap-1.5">
        {question.choices.map((option, optionIndex) => (
          <label key={option.value} className={cn('group/option', ROW)}>
            <input type={type} name={name} className="sr-only" checked={draft.picked.includes(option.value)} onChange={() => pick(option.value)} />
            <Mark multi={question.multi} />
            <span className="min-w-0 wrap-anywhere whitespace-pre-wrap">{option.value}</span>{' '}
            {option.recommended ? <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">Recomendada</span> : null}
            <Shortcut value={optionIndex + 1} />
          </label>
        ))}
        <div className="group/option flex flex-col rounded-lg border hover:bg-muted/60 has-checked:border-primary/50 has-checked:bg-primary/8 has-focus-visible:ring-2 has-focus-visible:ring-ring/50">
          <label className="flex min-h-11 cursor-pointer items-center gap-3 px-3 pt-2 pb-1 text-sm sm:min-h-9">
            <input type={type} name={name} className="sr-only" checked={draft.other} onChange={pickOther} />
            <Mark multi={question.multi} />
            <span>Outra resposta</span>
            <Shortcut value={question.choices.length + 1} />
          </label>
          <textarea
            ref={otherField}
            aria-label="Outra resposta"
            rows={1}
            enterKeyHint="send"
            placeholder="Escreva sua resposta"
            value={draft.text}
            onChange={event => write(event.target.value)}
            className={cn(FIELD, 'max-h-40 px-3 pb-2 pl-10')}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * The agent's question card, at the end of the turn and right above the message field: the questions one below the other,
 * each option a whole row, and always an "Outra resposta" row with a free field. Numbers pick the option and Enter sends.
 */
export function ClarifyCard({ questions, onSubmit, onSkip }: { questions: ClarifyQuestion[]; onSubmit: (answers: { qid: string; answer: string | null }[]) => void; onSkip: () => void }) {
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const form = useRef<HTMLFormElement>(null);
  const name = useId();
  const draftFor = (qid: string) => drafts[qid] ?? EMPTY;
  const answers = questions.map(question => ({ qid: question.qid, answer: answerOf(draftFor(question.qid)) }));
  const answered = answers.filter(item => item.answer !== null).length;
  const canSend = answered > 0;
  const several = questions.length > 1;

  const send = (event?: FormEvent) => {
    event?.preventDefault();
    if (canSend) onSubmit(answers);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    const target = event.target as HTMLElement;

    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && !(target instanceof HTMLButtonElement)) {
      event.preventDefault();
      send();
      return;
    }

    if (!/^[1-9]$/.test(event.key) || target instanceof HTMLTextAreaElement || event.metaKey || event.ctrlKey || event.altKey) return;

    const block = target.closest<HTMLElement>('[data-question]');
    const question = questions[block ? Number(block.dataset.question) : 0];
    const position = Number(event.key) - 1;

    if (!question || position > question.choices.length) return;

    event.preventDefault();
    (block ?? form.current)?.querySelectorAll<HTMLInputElement>('input')?.[position]?.click();
  };

  return (
    <section aria-label={several ? 'Perguntas do agente' : 'Pergunta do agente'} className="question-card-in scroll-mt-20 scroll-mb-44 rounded-lg border border-h2 bg-raised">
      <form ref={form} onSubmit={send} onKeyDown={onKeyDown}>
        <header className="flex items-center gap-2 px-4 pt-3 text-xs text-muted-foreground">
          <MessageCircleQuestionMark className="size-3.5 shrink-0" aria-hidden />
          <span className="min-w-0 flex-1 truncate">{several ? 'O agente quer saber algumas coisas' : 'O agente quer saber'}</span>
          {several ? (
            <span className="shrink-0 tabular-nums">
              {answered} de {questions.length}
            </span>
          ) : null}
        </header>
        <div className="flex flex-col gap-5 px-4 pt-2.5 pb-4">
          {questions.map((question, index) => (
            <QuestionBlock key={question.qid} question={question} index={index} draft={draftFor(question.qid)} name={`${name}-${question.qid}`} onChange={draft => setDrafts(current => ({ ...current, [question.qid]: draft }))} />
          ))}
        </div>
        <div data-acoes-pergunta className="flex items-center justify-end gap-2 border-t px-3 py-2">
          {several && answered < questions.length && answered > 0 ? <span className="mr-auto pl-1 text-xs text-muted-foreground">As outras vão como puladas.</span> : null}
          <Button type="button" variant="ghost" size="sm" onClick={onSkip}>
            Pular
          </Button>
          <Button type="submit" size="sm" disabled={!canSend}>
            Enviar respostas
          </Button>
        </div>
      </form>
    </section>
  );
}
