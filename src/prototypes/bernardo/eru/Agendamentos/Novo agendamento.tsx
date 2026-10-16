/** @studio-id v2svfgz45f1x2dxe */
// Novo agendamento, from eru features/schedules/ScheduleFormPage (ScheduleCreatePage): the empty form.
import { Link } from '@module/prototypes';
import { cn } from '#studio/runtime';
import { Button } from '@/systems/eru/components/button';
import AppShell, { PAGE_COLUMN, PageBar } from '../_components/shell/AppShell';
import { ScheduleForm } from '../_components/schedules/ScheduleForm';

export default function NovoAgendamento() {
  return (
    <AppShell current="agendamentos" bar={<PageBar title="Novo agendamento" context="Agendamentos" back={{ label: 'Voltar para agendamentos', to: 'Agendamentos/Agendamentos' }} />}>
      <article className={cn(PAGE_COLUMN, 'gap-6')}>
        <ScheduleForm
          initial={{ name: '', prompt: '', schedule: '', deliver: 'local' }}
          submitLabel="Criar agendamento"
          pendingLabel="Criando…"
          cancel={
            <Button variant="outline" render={<Link to="Agendamentos/Agendamentos" />}>
              Cancelar
            </Button>
          }
        />
      </article>
    </AppShell>
  );
}
