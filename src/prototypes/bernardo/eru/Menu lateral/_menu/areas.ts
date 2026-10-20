// The menu's own copy of the eru areas, so the exploration can reorder, regroup or rename them without touching the
// other screens. `to` is the prototype-relative path of the area's main view.
import { Brain, CalendarClock, FolderOpen, House, MessagesSquare, SquareTerminal, Users, type LucideIcon } from '@/systems/eru/libraries/icons';

export type AreaId = 'inicio' | 'sessoes' | 'agendamentos' | 'terminal' | 'memoria' | 'arquivos' | 'perfis';

export type MenuPlace = AreaId | 'nova-sessao';

export interface Area {
  id: AreaId;
  title: string;
  description: string;
  icon: LucideIcon;
  group: 'principal' | 'mais';
  to?: string;
}

export const AREAS: readonly Area[] = [
  { id: 'inicio', group: 'principal', title: 'Início', description: 'Comece uma sessão e veja o que está em andamento, as tarefas do dia e as sessões recentes.', icon: House, to: 'Início/Início' },
  { id: 'sessoes', group: 'principal', title: 'Sessões', description: 'Conversas com o agente no perfil ativo.', icon: MessagesSquare, to: 'Sessões/Sessões' },
  { id: 'agendamentos', group: 'principal', title: 'Agendamentos', description: 'Prompts que rodam sozinhos no horário definido.', icon: CalendarClock, to: 'Agendamentos/Agendamentos' },
  { id: 'terminal', group: 'mais', title: 'Terminal', description: 'Um shell no servidor do Hermes. Você pode abrir vários, em abas.', icon: SquareTerminal },
  { id: 'memoria', group: 'mais', title: 'Memória', description: 'O que o agente lembra sobre você e o trabalho.', icon: Brain, to: 'Memória/Memória' },
  { id: 'arquivos', group: 'mais', title: 'Arquivos', description: 'Pastas e arquivos do servidor.', icon: FolderOpen, to: 'Arquivos/Arquivos' },
  { id: 'perfis', group: 'mais', title: 'Perfis', description: 'Os perfis do Hermes e o papel de cada um.', icon: Users, to: 'Perfis/Perfis' },
];

export const NEW_SESSION_TO = 'Sessão/Nova sessão';

export const areaById = (id: AreaId) => AREAS.find(area => area.id === id)!;
