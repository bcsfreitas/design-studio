// Links between the tabs of the project page. In a tab's own view they go to the other tab's view, as eru's
// /projetos/$aba; in a state's view they switch the tab inside it, so the state reads the same on every tab.
import type { ReactNode } from 'react';
import { Link } from '@module/prototypes';
import { PROJECT_TABS, type ProjectTabId } from '../data/projeto';
import { useProjectPage } from './context';

const NOTE_HANDOFF = 'eru.projeto.nota';

export function TabLink({ tab, className, children, ...rest }: { tab: ProjectTabId; className?: string; children: ReactNode; 'aria-current'?: 'page'; 'aria-labelledby'?: string; 'aria-describedby'?: string; onClick?: () => void }) {
  const page = useProjectPage();
  if (page.local) {
    return (
      <button
        type="button"
        {...rest}
        onClick={() => {
          rest.onClick?.();
          page.goTab(tab);
        }}
        className={className}
      >
        {children}
      </button>
    );
  }
  const to = PROJECT_TABS.find(item => item.id === tab)!.to;
  return (
    <Link to={to} {...rest} className={className}>
      {children}
    </Link>
  );
}

/** Hands the note to open over to the Notas view when the link leaves this view. */
export function handNoteOver(nome: string) {
  try {
    window.sessionStorage.setItem(NOTE_HANDOFF, nome);
  } catch {
    return;
  }
}

export function takeHandedNote() {
  try {
    const nome = window.sessionStorage.getItem(NOTE_HANDOFF);
    window.sessionStorage.removeItem(NOTE_HANDOFF);
    return nome;
  } catch {
    return null;
  }
}
