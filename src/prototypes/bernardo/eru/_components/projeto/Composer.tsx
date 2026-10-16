// The simple message field ("O que o agente deve fazer?"), as eru's Composer with `simple`: only the text and send. Enter
// sends, Shift+Enter breaks the line. Sending opens the session, as eru does after starting it in the project.
import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { useNavigate } from '@module/prototypes';
import { cn } from '#studio/runtime';
import { Textarea } from '@/systems/eru/components/textarea';
import { ArrowUp } from '@/systems/eru/libraries/icons';
import styles from './Composer.module.css';

export function Composer({ label, placeholder, disabled = false }: { label: string; placeholder: string; disabled?: boolean }) {
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const canSend = !disabled && text.trim().length > 0;

  const send = (event?: FormEvent) => {
    event?.preventDefault();
    if (canSend) navigate('Sessão/Sessão');
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      send();
    }
  };

  return (
    <form onSubmit={send} className={styles.form}>
      <div className={styles.field}>
        <Textarea
          aria-label={label}
          value={text}
          onChange={event => setText(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          unstyled
          className={cn(styles.text, 'min-w-0 [&_textarea]:max-h-60 [&_textarea]:resize-none [&_textarea]:text-base [&_textarea]:leading-relaxed sm:[&_textarea]:text-sm')}
        />
        <div className={styles.bar}>
          <button type="submit" aria-label="Enviar" disabled={!canSend} className={cn(styles.send, canSend && styles.ready)}>
            <ArrowUp aria-hidden />
          </button>
        </div>
      </div>
    </form>
  );
}
