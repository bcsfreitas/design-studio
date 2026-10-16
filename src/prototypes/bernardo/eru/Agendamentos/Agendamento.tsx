/** @studio-id fze5eszmprnafk3v */
// Agendamento: one job's page, from eru features/schedules/ScheduleDetailPage and ScheduleActions. Editing, pausing,
// firing now and deleting work locally; each run opens its result.
import { useId, useState, type ReactNode } from 'react';
import { Link, useNavigate } from '@module/prototypes';
import { cn } from '#studio/runtime';
import { AlertDialog, AlertDialogClose, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogPopup, AlertDialogTitle } from '@/systems/eru/components/alert-dialog';
import { Badge } from '@/systems/eru/components/badge';
import { Button } from '@/systems/eru/components/button';
import { ErrorState } from '@/systems/eru/components/error-state';
import { Markdown } from '@/systems/eru/components/markdown';
import { Skeleton } from '@/systems/eru/components/skeleton';
import { LoaderCircle, Pause, Pencil, Play, Trash2, Zap } from '@/systems/eru/libraries/icons';
import AppShell, { PAGE_COLUMN, PageBar } from '../_components/shell/AppShell';
import { PROFILE } from '../_components/data/workspace';
import { TONE_VARIANT, isPaused, jobById, stateInfo, type CronJob, type CronRun } from '../_components/data/schedules';

const BACK = { label: 'Voltar para agendamentos', to: 'Agendamentos/Agendamentos' };
const TOUCH = 'min-h-11 sm:min-h-7';

function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h2 id={id} className="font-heading text-lg font-semibold tracking-tight">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:grid sm:grid-cols-[10rem_1fr] sm:gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-sm break-words">{children}</dd>
    </div>
  );
}

function Configuration({ job }: { job: CronJob }) {
  return (
    <Section title="Configuração">
      <dl className="flex flex-col gap-3 rounded-lg border p-4">
        <Field label="Horário">
          <span className="flex flex-col">
            <span>{job.scheduleText}</span>
            <code className="font-mono text-xs text-muted-foreground">{job.source}</code>
          </span>
        </Field>
        <Field label="Próxima execução">{job.next ? <span className={job.next.overdue ? 'text-destructive' : undefined}>{job.next.overdue ? `${job.next.text} (atrasada)` : job.next.text}</span> : 'Nenhuma prevista'}</Field>
        <Field label="Última execução">{job.lastRun ?? 'Nunca rodou'}</Field>
        <Field label="Destino de entrega">{job.deliver === 'local' ? 'Local (só salva o resultado)' : job.deliver === 'whatsapp' ? 'WhatsApp' : job.deliver}</Field>
        {job.model ? <Field label="Modelo">{job.model}</Field> : null}
        {job.skills?.length ? <Field label="Skills">{job.skills.join(', ')}</Field> : null}
        {job.script ? (
          <Field label="Script">
            <code className="font-mono text-xs">{job.script}</code>
          </Field>
        ) : null}
      </dl>
    </Section>
  );
}

function RunItem({ run }: { run: CronRun }) {
  const [open, setOpen] = useState(false);
  const replyId = useId();

  return (
    <li className="flex flex-col gap-2 rounded-lg border p-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-sm font-medium tabular-nums">{run.when}</span>
        {run.outcome.label ? <Badge variant={TONE_VARIANT[run.outcome.tone]}>{run.outcome.label}</Badge> : null}
        {run.duration ? <span className="text-xs text-muted-foreground tabular-nums">{run.duration}</span> : null}
        {run.outcome.hasReply ? (
          <Button variant="ghost" size="sm" className="ml-auto min-h-11 sm:min-h-7" aria-expanded={open} aria-controls={replyId} onClick={() => setOpen(value => !value)}>
            {open ? 'Esconder resultado' : 'Ver resultado'}
          </Button>
        ) : null}
      </div>
      {run.outcome.text ? <p className="text-sm whitespace-pre-wrap break-words text-muted-foreground">{run.outcome.text}</p> : null}
      <div id={replyId} hidden={!open}>
        {open ? (
          run.reply ? (
            <Markdown variant="compact" className="max-h-80 overflow-y-auto rounded-md bg-muted p-3">
              {run.reply}
            </Markdown>
          ) : (
            <p className="text-sm text-muted-foreground">Esta execução não tem resposta do agente.</p>
          )
        ) : null}
      </div>
    </li>
  );
}

function Runs({ runs, loading }: { runs: CronRun[]; loading?: boolean }) {
  return (
    <Section title="Últimas execuções">
      {loading ? (
        <Skeleton aria-label="Carregando execuções" className="h-16 w-full" />
      ) : runs.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Ainda não houve execuções.</p>
      ) : (
        <ul aria-label="Últimas execuções" className="flex flex-col gap-2">
          {runs.map(run => (
            <RunItem key={run.id} run={run} />
          ))}
        </ul>
      )}
    </Section>
  );
}

function ScheduleActions({ job, triggering, onToggle, onTrigger }: { job: CronJob; triggering: boolean; onToggle: () => void; onTrigger: () => void }) {
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [confirmingTrigger, setConfirmingTrigger] = useState(false);
  const paused = isPaused(job);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" className={TOUCH} render={<Link to="Agendamentos/Editar agendamento" />}>
          <Pencil />
          Editar
        </Button>
        {paused ? (
          <Button variant="outline" size="sm" className={TOUCH} onClick={onToggle}>
            <Play />
            Retomar
          </Button>
        ) : job.state !== 'completed' ? (
          <Button variant="outline" size="sm" className={TOUCH} onClick={onToggle}>
            <Pause />
            Pausar
          </Button>
        ) : null}
        <Button variant="outline" size="sm" className={TOUCH} disabled={triggering} onClick={() => (paused ? setConfirmingTrigger(true) : onTrigger())}>
          {triggering ? <LoaderCircle className="motion-safe:animate-spin" aria-hidden /> : <Zap />}
          {triggering ? 'Rodando…' : 'Disparar agora'}
        </Button>
        <Button variant="outline" size="sm" className={`${TOUCH} text-destructive hover:text-destructive`} onClick={() => setConfirming(true)}>
          <Trash2 />
          Apagar
        </Button>
      </div>

      {triggering ? (
        <p role="status" className="text-sm text-muted-foreground">
          Rodando agora. A execução aparece em Últimas execuções quando começar.
        </p>
      ) : null}

      <AlertDialog open={confirmingTrigger} onOpenChange={setConfirmingTrigger}>
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>Disparar e retomar?</AlertDialogTitle>
            <AlertDialogDescription>“{job.name}” está pausado. Disparar agora também o retoma: depois desta execução, ele volta a rodar no horário.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="ghost" />}>Cancelar</AlertDialogClose>
            <AlertDialogClose
              render={<Button />}
              onClick={() => {
                onToggle();
                onTrigger();
              }}
            >
              Disparar e retomar
            </AlertDialogClose>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar agendamento?</AlertDialogTitle>
            <AlertDialogDescription>
              “{job.name}” será apagado do perfil {PROFILE.name} e não roda mais. Isso não pode ser desfeito.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="ghost" />}>Cancelar</AlertDialogClose>
            <Button variant="destructive" onClick={() => navigate('Agendamentos/Agendamentos')}>
              Apagar
            </Button>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </div>
  );
}

export type ScheduleDetailState = 'ready' | 'loading' | 'error' | 'not-found';

export function ScheduleDetailScreen({ jobId = 'b215522346b0', state = 'ready' }: { jobId?: string; state?: ScheduleDetailState }) {
  const [job, setJob] = useState(() => jobById(jobId));
  const [triggering, setTriggering] = useState(false);
  const status = stateInfo(job);

  const toggle = () => setJob(current => ({ ...current, state: isPaused(current) ? 'scheduled' : 'paused', next: isPaused(current) ? { text: 'sáb., 17 de out., 00:30' } : null }));

  const trigger = () => {
    setTriggering(true);
    window.setTimeout(() => {
      setTriggering(false);
      setJob(current => ({ ...current, runs: [{ id: `r${current.runs.length + 1}`, when: '16 de out. de 2026, 15:41', outcome: { label: 'Concluída', tone: 'ok', text: null, hasReply: true }, duration: '2 min', reply: 'Relatório salvo em `~/Vaults/Personal/ingestion/financas-2026-10-16.md`. 2 transações novas.' }, ...current.runs] }));
    }, 2500);
  };

  const ready = state === 'ready';
  const bar = ready ? (
    <PageBar title={job.name} marks={<Badge variant={TONE_VARIANT[status.tone]}>{status.label}</Badge>} context="Agendamentos" back={BACK} />
  ) : (
    <PageBar title={state === 'not-found' ? 'Agendamento não encontrado' : 'Agendamento'} context="Agendamentos" back={BACK} />
  );

  return (
    <AppShell current="agendamentos" bar={bar}>
      <article className={cn(PAGE_COLUMN, 'gap-6')}>
        {state === 'loading' ? (
          <div aria-label="Carregando agendamento" className="flex flex-col gap-3">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : state === 'not-found' ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-8 text-center">
            <p className="font-medium">Agendamento não encontrado neste perfil.</p>
            <p className="text-sm text-muted-foreground">Ele pode ter sido apagado ou pertencer a outro perfil.</p>
          </div>
        ) : state === 'error' ? (
          <ErrorState title="Não foi possível carregar o agendamento." onRetry={() => undefined} />
        ) : (
          <>
            <ScheduleActions job={job} triggering={triggering} onToggle={toggle} onTrigger={trigger} />
            {job.lastError ? <ErrorState title="Último erro" description={job.lastError} /> : null}
            <Configuration job={job} />
            <Section title="Prompt">
              {job.prompt.trim() ? (
                <p className="rounded-lg border bg-muted/40 p-4 text-sm whitespace-pre-wrap break-words">{job.prompt}</p>
              ) : (
                <p className="text-sm text-muted-foreground">{job.script ? 'Este agendamento só roda um script, sem o agente.' : 'Sem prompt.'}</p>
              )}
            </Section>
            <Runs runs={job.runs} />
          </>
        )}
      </article>
    </AppShell>
  );
}

export default function Agendamento() {
  return <ScheduleDetailScreen />;
}
