/** @studio-id 8nhm2wc3ht9qf0tn */
// Editar agendamento, from eru features/schedules/ScheduleFormPage (ScheduleEditPage): the form filled with the job, the
// job's name as the bar's context and the way back to its page.
import { Link } from '@module/prototypes';
import { cn } from '#studio/runtime';
import { Button } from '@/systems/eru/components/button';
import AppShell, { PAGE_COLUMN, PageBar } from '../_components/shell/AppShell';
import { ScheduleForm } from '../_components/schedules/ScheduleForm';
import { jobById } from '../_components/data/schedules';

export default function EditarAgendamento() {
  const job = jobById('b215522346b0');

  return (
    <AppShell current="agendamentos" bar={<PageBar title="Editar agendamento" context={job.name} back={{ label: 'Voltar para o agendamento', to: 'Agendamentos/Agendamento' }} />}>
      <article className={cn(PAGE_COLUMN, 'gap-6')}>
        <ScheduleForm
          initial={{ name: job.name, prompt: job.prompt, schedule: job.source, deliver: job.deliver }}
          submitLabel="Salvar"
          pendingLabel="Salvando…"
          cancel={
            <Button variant="outline" render={<Link to="Agendamentos/Agendamento" />}>
              Cancelar
            </Button>
          }
        />
      </article>
    </AppShell>
  );
}
