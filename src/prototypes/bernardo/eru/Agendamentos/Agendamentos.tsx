/** @studio-id 2kgzfg078qpsjay8 */
// Agendamentos, from eru features/schedules/SchedulesPage: the jobs of the profile grouped as Ativos, Pausados and
// Concluídos, each with its schedule in words, the next run and a mark when the last run failed.
import { Link } from '@module/prototypes';
import { cn } from '#studio/runtime';
import { ErrorState } from '@/systems/eru/components/error-state';
import { ListGroup, ListRow } from '@/systems/eru/components/grouped-list';
import { Badge } from '@/systems/eru/components/badge';
import { Skeleton } from '@/systems/eru/components/skeleton';
import { CalendarClock, CircleAlert, Plus } from '@/systems/eru/libraries/icons';
import AppShell, { PAGE_COLUMN, PageBar } from '../_components/shell/AppShell';
import { PageBarAction } from '../_components/shell/PageBarAction';
import { PROFILE } from '../_components/data/workspace';
import { JOBS, TONE_VARIANT, isPaused, stateInfo, type CronJob } from '../_components/data/schedules';

export type SchedulesState = 'ready' | 'loading' | 'error' | 'empty';

function groups(jobs: CronJob[]) {
  const groupOf = (job: CronJob) => (job.state === 'completed' ? 'Concluídos' : isPaused(job) ? 'Pausados' : 'Ativos');
  return ['Ativos', 'Pausados', 'Concluídos']
    .map(name => ({ name, jobs: jobs.filter(job => groupOf(job) === name) }))
    .filter(group => group.jobs.length > 0)
    .map(group => ({ heading: `${group.name} · ${group.jobs.length}`, jobs: group.jobs }));
}

function JobRow({ job }: { job: CronJob }) {
  const state = stateInfo(job);
  const marked = job.state !== 'scheduled';

  return (
    <ListRow label={job.name} render={<Link to="Agendamentos/Agendamento" />}>
      <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        <span className="min-w-0 font-medium break-words">{job.name}</span>
        {marked ? <Badge variant={TONE_VARIANT[state.tone]}>{state.label}</Badge> : null}
      </span>
      <span className="text-sm text-muted-foreground">{job.scheduleText}</span>
      {job.next ? (
        <span className={job.next.overdue ? 'text-xs text-destructive' : 'text-xs text-muted-foreground/80'}>{job.next.overdue ? `Próxima atrasada: ${job.next.text}` : `Próxima: ${job.next.text}`}</span>
      ) : null}
      {job.lastFailed ? (
        <span className="flex items-center gap-1 text-xs text-destructive">
          <CircleAlert className="size-3.5 shrink-0" aria-hidden />
          Última execução falhou
        </span>
      ) : null}
    </ListRow>
  );
}

export function SchedulesScreen({ state = 'ready' }: { state?: SchedulesState }) {
  const jobs = state === 'empty' ? [] : JOBS;

  return (
    <AppShell current="agendamentos" bar={<PageBar area="agendamentos" action={<PageBarAction icon={Plus} label="Novo agendamento" render={<Link to="Agendamentos/Novo agendamento" />} />} />}>
      <section className={cn(PAGE_COLUMN, 'gap-2')}>
        <div>
          {state === 'loading' ? (
            <div aria-label="Carregando agendamentos" className="flex flex-col gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-48 w-full rounded-xl" />
            </div>
          ) : state === 'error' ? (
            <ErrorState title="Não foi possível carregar os agendamentos." onRetry={() => undefined} />
          ) : jobs.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-8 text-center">
              <CalendarClock className="size-6 text-muted-foreground" aria-hidden />
              <p className="font-medium">Nenhum agendamento neste perfil.</p>
              <p className="text-sm text-muted-foreground">Os agendamentos do perfil {PROFILE.name} aparecem aqui.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {groups(jobs).map(group => (
                <ListGroup key={group.heading} heading={group.heading}>
                  {group.jobs.map(job => (
                    <JobRow key={job.id} job={job} />
                  ))}
                </ListGroup>
              ))}
            </div>
          )}
        </div>
      </section>
    </AppShell>
  );
}

export default function Agendamentos() {
  return <SchedulesScreen />;
}
