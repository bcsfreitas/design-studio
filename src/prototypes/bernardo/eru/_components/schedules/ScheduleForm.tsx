// The schedule form, from eru features/schedules/ScheduleForm: name, prompt, schedule with its preview and presets, and the
// delivery targets. Validation runs locally; saving goes to the schedule's page.
import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate } from '@module/prototypes';
import { Button } from '@/systems/eru/components/button';
import { Input } from '@/systems/eru/components/input';
import { Label } from '@/systems/eru/components/label';
import { Textarea } from '@/systems/eru/components/textarea';
import { DELIVERY_TARGETS, PRESETS, SCHEDULE_FORMATS, schedulePreview } from '../data/schedules';

export interface Draft {
  name: string;
  prompt: string;
  schedule: string;
  deliver: string;
}

type Field = keyof Draft;
type FieldErrors = Partial<Record<Field, string>>;

function validate(draft: Draft, promptRequired: boolean): FieldErrors {
  const errors: FieldErrors = {};
  if (promptRequired && !draft.prompt.trim()) errors.prompt = 'Escreva o prompt.';
  if (!draft.schedule.trim()) errors.schedule = 'Informe o horário.';
  if (!draft.deliver) errors.deliver = 'Escolha pelo menos um destino.';
  return errors;
}

function FieldError({ id, children }: { id: string; children: ReactNode }) {
  return children ? (
    <p id={id} className="text-sm text-destructive">
      {children}
    </p>
  ) : null;
}

const describedBy = (...ids: (string | false | undefined)[]) => ids.filter(Boolean).join(' ') || undefined;

const splitTargets = (deliver: string) => [...new Set(deliver.split(',').map(target => target.trim()).filter(Boolean))];

function DeliveryTargets({ value, onChange, error }: { value: string; onChange: (next: string) => void; error?: string }) {
  const errorId = useId();
  const baseId = useId();
  const selected = splitTargets(value);

  const toggle = (id: string, checked: boolean) => onChange((checked ? [...selected, id] : selected.filter(target => target !== id)).join(','));

  return (
    <fieldset aria-describedby={error ? errorId : undefined} aria-invalid={error ? true : undefined} className="flex flex-col gap-2">
      <legend className="mb-2 text-sm leading-none font-medium">Destino de entrega</legend>
      <div className="flex flex-col gap-1 rounded-lg border p-1">
        {DELIVERY_TARGETS.map((target, index) => (
          <label key={target.id} htmlFor={`${baseId}-${index}`} className="flex min-h-10 cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50">
            <input id={`${baseId}-${index}`} type="checkbox" className="size-4 shrink-0 accent-primary" checked={selected.includes(target.id)} onChange={event => toggle(target.id, event.target.checked)} />
            <span className="min-w-0 break-words">{target.label}</span>
          </label>
        ))}
      </div>
      <FieldError id={errorId}>{error}</FieldError>
    </fieldset>
  );
}

export function ScheduleForm({ initial, submitLabel, pendingLabel, cancel, optionalPrompt = null }: { initial: Draft; submitLabel: string; pendingLabel: string; cancel: ReactNode; optionalPrompt?: string | null }) {
  const navigate = useNavigate();
  const [draft, setDraft] = useState(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, setPending] = useState(false);
  const ids = { name: useId(), nameHint: useId(), prompt: useId(), promptHint: useId(), promptError: useId(), schedule: useId(), scheduleHint: useId(), scheduleError: useId() };
  const preview = schedulePreview(draft.schedule);

  const change = (field: Field, value: string) => {
    setDraft(current => ({ ...current, [field]: value }));
    setErrors(current => ({ ...current, [field]: undefined }));
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const invalid = validate(draft, !optionalPrompt);
    setErrors(invalid);
    if (Object.keys(invalid).length > 0) return;
    setPending(true);
    window.setTimeout(() => navigate('Agendamentos/Agendamento'), 700);
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor={ids.name}>Nome</Label>
        <Input id={ids.name} value={draft.name} onChange={event => change('name', event.target.value)} autoComplete="off" aria-describedby={ids.nameHint} />
        <p id={ids.nameHint} className="text-xs text-muted-foreground">
          Opcional. Sem nome, a lista mostra o começo do prompt.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={ids.prompt}>{optionalPrompt ? 'Prompt (opcional)' : 'Prompt'}</Label>
        <Textarea
          id={ids.prompt}
          value={draft.prompt}
          onChange={event => change('prompt', event.target.value)}
          rows={6}
          placeholder="O que o agente deve fazer em cada execução."
          aria-invalid={errors.prompt ? true : undefined}
          aria-describedby={describedBy(Boolean(optionalPrompt) && ids.promptHint, errors.prompt && ids.promptError)}
        />
        {optionalPrompt ? (
          <p id={ids.promptHint} className="text-xs text-muted-foreground">
            {optionalPrompt}
          </p>
        ) : null}
        <FieldError id={ids.promptError}>{errors.prompt}</FieldError>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={ids.schedule}>Horário</Label>
        <Input
          id={ids.schedule}
          value={draft.schedule}
          onChange={event => change('schedule', event.target.value)}
          className="font-mono"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="0 9 * * *"
          aria-invalid={errors.schedule ? true : undefined}
          aria-describedby={describedBy(ids.scheduleHint, errors.schedule && ids.scheduleError)}
        />
        <p id={ids.scheduleHint} className="text-xs text-muted-foreground">
          {preview ? <span className="font-medium text-foreground">{preview}. </span> : null}
          Use {SCHEDULE_FORMATS}.
        </p>
        <FieldError id={ids.scheduleError}>{errors.schedule}</FieldError>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(preset => (
            <Button key={preset.value} type="button" variant="outline" size="sm" className="min-h-11 sm:min-h-7" onClick={() => change('schedule', preset.value)}>
              {preset.label}
            </Button>
          ))}
        </div>
      </div>

      <DeliveryTargets value={draft.deliver} onChange={value => change('deliver', value)} error={errors.deliver} />

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {cancel}
        <Button type="submit" disabled={pending}>
          {pending ? pendingLabel : submitLabel}
        </Button>
      </div>
    </form>
  );
}
