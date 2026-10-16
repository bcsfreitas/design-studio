// The page drawer, as eru's PageDrawerHost and DrawerShell on a computer: up to 560 px on the right edge of the main card,
// below the page bar and over the content, with the header (title, actions, X) and a body that is the only part that
// scrolls. Esc outside a field closes it. It goes in AppShell's `layer`.
import { useEffect, useRef, type ReactNode } from 'react';
import { Button } from '@/systems/eru/components/button';
import { X } from '@/systems/eru/libraries/icons';
import { motion } from '@/systems/eru/libraries/motion';

const EASE = [0.23, 1, 0.32, 1] as const;

export function PageDrawer({ label, title, actions, onClose, children }: { label: string; title: ReactNode; actions?: ReactNode; onClose: () => void; children: ReactNode }) {
  const close = useRef(onClose);

  useEffect(() => {
    close.current = onClose;
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (event.key !== 'Escape' || event.defaultPrevented || target?.closest('input, textarea, [contenteditable="true"], [role=dialog], [role=alertdialog], [role=menu]')) return;
      event.preventDefault();
      close.current();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="pointer-events-none absolute top-[calc(3.5rem+6px)] right-3 bottom-3.5 left-3 z-40 flex items-start justify-end">
      <motion.aside
        aria-label={label}
        initial={{ opacity: 0, x: 6 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.18, ease: EASE }}
        className="pointer-events-auto flex max-h-full min-h-0 min-w-0 flex-[0_1_560px] flex-col overflow-hidden rounded-xl border border-h2 bg-raised text-ink shadow-[0_24px_60px_-18px_rgb(0_0_0/0.4),0_2px_8px_rgb(0_0_0/0.1)]"
      >
        <header className="flex shrink-0 items-center gap-1 border-b py-1 pr-1 pl-3">
          <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">{title}</span>
          {actions}
          <Button variant="ghost" size="icon-sm" aria-label={`Fechar ${label.charAt(0).toLowerCase()}${label.slice(1)}`} title="Fechar" onClick={onClose}>
            <X aria-hidden />
          </Button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
      </motion.aside>
    </div>
  );
}
