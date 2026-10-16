// What every tab and every block of the project page reads, as eru's useProjectPage(): the project, the loading state
// and the local actions (open a card or a file in the drawer, move a card, open a note).
import { createContext, useContext } from 'react';
import type { CaixaItem, CardAcao, Nota, ProjectData, ProjectTabId, QuadroCard } from '../data/projeto';

export type LoadState = 'pronto' | 'carregando' | 'erro';

export type DrawerItem = { kind: 'card'; id: string } | { kind: 'arquivo'; caminho: string } | null;

export interface ProjectPageValue {
  data: ProjectData;
  cards: QuadroCard[];
  notas: Nota[];
  caixa: CaixaItem[];
  status: LoadState;
  /** The project list arrived: before it, the name is the folder's and the bar has no seal. */
  known: boolean;
  tab: ProjectTabId;
  /** Tabs switch inside the view (a state's view) instead of going to the tab's own view. */
  local: boolean;
  goTab: (tab: ProjectTabId) => void;
  retry: () => void;
  drawer: DrawerItem;
  setDrawer: (item: DrawerItem) => void;
  act: (id: string, acao: CardAcao | 'editar', change?: Partial<QuadroCard>) => void;
  addCard: (card: QuadroCard) => void;
  /** The open note: a file name, 'nova' for a blank one, or null for the list. */
  note: string | null;
  setNote: (nome: string | null) => void;
  setNotas: (update: (notas: Nota[]) => Nota[]) => void;
  setCaixa: (update: (items: CaixaItem[]) => CaixaItem[]) => void;
  dentro: string;
  setDentro: (caminho: string) => void;
}

export const ProjectPageContext = createContext<ProjectPageValue | null>(null);

export function useProjectPage() {
  const value = useContext(ProjectPageContext);
  if (!value) throw new Error('useProjectPage fora da página do projeto');
  return value;
}

export const leafOf = (path: string) => path.slice(path.lastIndexOf('/') + 1);
